import React, { useState } from 'react';
import { useCourse } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const EnrollmentPage = () => {
  const { courses, periods, enrollInCourse, getCurrentPeriod, loading } = useCourse();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  const currentPeriod = getCurrentPeriod();

  // Auto-seleccionar periodo actual si existe
  React.useEffect(() => {
    if (currentPeriod && !selectedPeriod) {
      setSelectedPeriod(currentPeriod.id_periodo);
    }
  }, [currentPeriod, selectedPeriod]);

  const handleEnroll = async () => {
    if (!selectedCourse || !selectedPeriod) return;
    
    setEnrolling(true);
    const result = await enrollInCourse(selectedCourse, selectedPeriod);
    setEnrolling(false);
    
    if (result.success) {
      setEnrollmentResult({ success: true, data: result.data });
      setStep(4); // Paso de éxito
    } else {
      setEnrollmentResult({ success: false, error: result.error });
      setStep(4); // Paso de error
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedCourse(null);
    setSelectedPeriod(null);
    setEnrollmentResult(null);
  };

  const goToChat = () => {
    navigate('/chat');
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Inscripción en Cursos</h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-full h-1 mx-2 ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Periodo</span>
          <span>Curso</span>
          <span>Confirmar</span>
        </div>
      </div>

      {/* Step 1: Seleccionar Periodo */}
      {step === 1 && (
        <Card title="Paso 1: Seleccionar Periodo Académico">
          <div className="space-y-3">
            {periods.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay periodos académicos disponibles. Contacta al administrador.
              </p>
            ) : (
              periods.map((period) => (
                <div
                  key={period.id_periodo}
                  onClick={() => setSelectedPeriod(period.id_periodo)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPeriod === period.id_periodo
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{period.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(period.fecha_inicio).toLocaleDateString()} - {new Date(period.fecha_fin).toLocaleDateString()}
                      </p>
                    </div>
                    {period.es_actual && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        Actual
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedPeriod}
            >
              Siguiente →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Seleccionar Curso */}
      {step === 2 && (
        <Card title="Paso 2: Seleccionar Curso">
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              ← Volver al periodo
            </Button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {courses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay cursos disponibles.
              </p>
            ) : (
              courses.map((course) => (
                <div
                  key={course.id_curso}
                  onClick={() => setSelectedCourse(course.id_curso)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCourse === course.id_curso
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {course.codigo_curso}
                      </span>
                      <p className="font-medium mt-1">{course.nombre_curso}</p>
                      <p className="text-xs text-gray-500">{course.escuela}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {course.creditos} créditos
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              ← Atrás
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedCourse}
            >
              Siguiente →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Confirmar */}
      {step === 3 && (
        <Card title="Paso 3: Confirmar Inscripción">
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              ← Volver al curso
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Resumen de la inscripción:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estudiante:</span>
                <span className="font-medium">{user?.nombres} {user?.apellidos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Código:</span>
                <span className="font-medium">{user?.codigo_universitario}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Periodo:</span>
                  <span className="font-medium">
                    {periods.find(p => p.id_periodo === selectedPeriod)?.nombre}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Curso:</span>
                  <span className="font-medium">
                    {courses.find(c => c.id_curso === selectedCourse)?.codigo_curso} -{' '}
                    {courses.find(c => c.id_curso === selectedCourse)?.nombre_curso}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Créditos:</span>
                  <span className="font-medium">
                    {courses.find(c => c.id_curso === selectedCourse)?.creditos}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              ← Atrás
            </Button>
            <Button
              onClick={handleEnroll}
              disabled={enrolling}
              loading={enrolling}
            >
              Confirmar Inscripción
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Resultado */}
      {step === 4 && (
        <Card>
          {enrollmentResult?.success ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">¡Inscripción Exitosa!</h2>
              <p className="text-gray-600 mb-6">
                Te has inscrito correctamente en el curso.
              </p>
              <div className="space-x-3">
                <Button onClick={goToChat}>
                  Ir al Chat →
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Inscribir otro curso
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Error en la Inscripción</h2>
              <p className="text-red-600 mb-6">
                {enrollmentResult?.error?.message || 'Ocurrió un error al procesar la inscripción.'}
              </p>
              <Button variant="outline" onClick={handleReset}>
                Intentar nuevamente
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default EnrollmentPage;
