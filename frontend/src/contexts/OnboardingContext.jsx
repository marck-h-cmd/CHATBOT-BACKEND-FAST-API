import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getOnboardingStatus, updateOnboardingStatus } from '../api/onboarding';

const OnboardingContext = createContext(null);

const ONBOARDING_STORAGE_KEY = 'sylia_onboarding_estudiante_v1';

const STUDENT_STEPS = [
  {
    id: 'welcome',
    route: '/dashboard',
    title: 'Bienvenido a Sylia',
    description:
      'Este recorrido te mostrara el flujo recomendado para usar el sistema: inscribirte, revisar tus cursos y luego consultar al asistente.',
    target: null,
  },
  {
    id: 'dashboard-tools',
    route: '/dashboard',
    title: 'Empieza por: "Catalogo"',
    description:
      'Haz clic en la opcion "Catalogo - Inscribete en nuevos cursos" para iniciar tu flujo academico.',
    target: '[data-tour="student-catalog-option"]',
  },
  {
    id: 'course-catalog',
    route: '/cursos',
    title: 'Paso 1: Inscribete en un ciclo',
    description:
      'Explora el catalogo, filtra por ciclo y usa "Inscribirse" para crear tu contexto academico.',
    target: '[data-tour="student-course-catalog"]',
  },
  {
    id: 'enrollment',
    route: '/inscripcion',
    title: 'Paso 2: Confirma tu matricula',
    description:
      'Selecciona periodo y ciclo para finalizar la inscripcion. Esto habilita tu trabajo por contexto.',
    target: '[data-tour="student-enrollment"]',
  },
  {
    id: 'my-courses',
    route: '/mis-cursos',
    title: 'Paso 3: Revisa tus cursos',
    description:
      'En esta pantalla verificas el estado del silabo y puedes registrar notas para simulaciones.',
    target: '[data-tour="student-mycourses"]',
  },
  {
    id: 'chat-context',
    route: '/chat',
    title: 'Paso 4: Selecciona un curso en el chat',
    description:
      'Antes de preguntar, elige un curso en la barra lateral para que Sylia responda con el contexto correcto.',
    target: '[data-tour="student-chat-sidebar"]',
  },
  {
    id: 'chat-input',
    route: '/chat',
    title: 'Paso 5: Consulta a Sylia',
    description:
      'Escribe tu consulta aqui. Si el silabo esta validado, podras usar respuestas academicas completas.',
    target: '[data-tour="student-chat-input"]',
  },
];

function readStoredOnboardingState() {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return { completed: false, skipped: false, version: 1 };
    }
    const parsed = JSON.parse(raw);
    return {
      completed: !!parsed.completed,
      skipped: !!parsed.skipped,
      version: Number(parsed.version || 1),
    };
  } catch {
    return { completed: false, skipped: false, version: 1 };
  }
}

function saveStoredOnboardingState(nextState) {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextState));
}

export const OnboardingProvider = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState(() => ({
    completed: false,
    skipped: false,
    version: 1,
  }));
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoStartedRef = useRef(false);

  const isStudent = user?.rol === 'estudiante';
  const steps = STUDENT_STEPS;
  const currentStep = running ? steps[stepIndex] : null;

  const startOnboarding = useCallback((startAt = 0) => {
    setStepIndex(Math.max(0, Math.min(startAt, steps.length - 1)));
    setRunning(true);
  }, [steps.length]);

  const closeOnboarding = useCallback(() => {
    setRunning(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    const nextState = { ...state, completed: true, skipped: false, version: 1 };
    setState(nextState);
    saveStoredOnboardingState(nextState);
    // Persist server-side if possible
    if (isAuthenticated) {
      try {
        updateOnboardingStatus({ completed: true });
      } catch (e) {
        // ignore failures, keep local fallback
      }
    }
    setRunning(false);
  }, [state]);

  const skipOnboarding = useCallback(() => {
    const nextState = { ...state, completed: false, skipped: true, version: 1 };
    setState(nextState);
    saveStoredOnboardingState(nextState);
    if (isAuthenticated) {
      try {
        updateOnboardingStatus({ skipped: true });
      } catch (e) {
        // ignore
      }
    }
    setRunning(false);
  }, [state]);

  const restartOnboarding = useCallback(() => {
    const nextState = { completed: false, skipped: false, version: 1 };
    setState(nextState);
    saveStoredOnboardingState(nextState);
    setStepIndex(0);
    setRunning(true);
    autoStartedRef.current = true;
    if (isAuthenticated) {
      try {
        updateOnboardingStatus({ completed: false, skipped: false, version: 1 });
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const goToNextStep = useCallback(() => {
    setStepIndex((prev) => {
      if (prev >= steps.length - 1) {
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length]);

  const goToPreviousStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated || !isStudent) {
      setRunning(false);
      setStepIndex(0);
      autoStartedRef.current = false;
      return;
    }

    let cancelled = false;

    (async () => {
      // First, try server-side state
      try {
        const resp = await getOnboardingStatus();
        if (!cancelled && resp && resp.data) {
          const srv = resp.data;
          const serverState = {
            completed: !!srv.completed,
            skipped: !!srv.skipped,
            version: Number(srv.version || 1),
          };
          setState(serverState);
          saveStoredOnboardingState(serverState);

          if (!serverState.completed && !serverState.skipped && !autoStartedRef.current) {
            setStepIndex(0);
            setRunning(true);
            autoStartedRef.current = true;
          }
          return;
        }
      } catch (e) {
        // ignore, fallback to localStorage
      }

      const stored = readStoredOnboardingState();
      setState(stored);

      if (!stored.completed && !stored.skipped && !autoStartedRef.current) {
        setStepIndex(0);
        setRunning(true);
        autoStartedRef.current = true;
      }
    })();
  }, [loading, isAuthenticated, isStudent]);

  useEffect(() => {
    if (!running || !currentStep?.route) {
      return;
    }

    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
  }, [running, currentStep?.route, location.pathname, navigate]);

  useEffect(() => {
    if (!running) {
      return;
    }

    if (stepIndex >= steps.length) {
      completeOnboarding();
    }
  }, [running, stepIndex, steps.length, completeOnboarding]);

  const canStartOnboarding = isAuthenticated && isStudent;

  const value = useMemo(
    () => ({
      running,
      stepIndex,
      steps,
      currentStep,
      canStartOnboarding,
      isStudent,
      state,
      startOnboarding,
      restartOnboarding,
      closeOnboarding,
      completeOnboarding,
      skipOnboarding,
      goToNextStep,
      goToPreviousStep,
      isFirstStep: stepIndex === 0,
      isLastStep: stepIndex === steps.length - 1,
    }),
    [
      running,
      stepIndex,
      steps,
      currentStep,
      canStartOnboarding,
      isStudent,
      state,
      startOnboarding,
      restartOnboarding,
      closeOnboarding,
      completeOnboarding,
      skipOnboarding,
      goToNextStep,
      goToPreviousStep,
    ]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
