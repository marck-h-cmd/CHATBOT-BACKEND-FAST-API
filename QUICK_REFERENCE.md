# 📋 QUICK REFERENCE - CRITICAL BLOCKERS & FIXES

## TL;DR - What's Broken Right Now

The system **WILL NOT START** without fixing these 8 critical issues:

### 🔴 Backend Blockers

| # | Issue | Impact | File | Fix Time |
|---|-------|--------|------|----------|
| **B1** | `AuthService` incomplete | Login fails | `app/core/security.py` | 1 hr |
| **B2** | Missing auth endpoints | 404 errors | `app/api/routes/auth.py` | 1 hr |
| **B3** | No similarity function | Chat crashes | `app/services/embeddings.py` | 30 min |
| **B4** | ChatResponse incomplete | Validation error | `app/services/chat_handler.py` | 15 min |
| **B5** | No token blacklist on logout | Security break | `app/api/routes/auth.py` | 30 min |
| **B6** | No global error handler | Unhandled exceptions | `app/main.py` | 30 min |

### 🔴 Frontend Blockers

| # | Issue | Impact | File | Fix Time |
|---|-------|--------|------|----------|
| **F1** | `CourseContext` missing | Chat page crashes | NEW FILE | 1 hr |
| **F2** | No error boundaries | Single error kills app | NEW FILE | 30 min |

---

## 1️⃣ Priority: FIX AuthService (Backend)

**Status:** ❌ Incomplete - method body missing  
**File:** `backend/app/core/security.py`  
**Problem:** Login/registration endpoints will crash at runtime

```python
# CURRENT - BROKEN:
class AuthService:
    @staticmethod
    def registrar_usuario(...):
        # ❌ NO IMPLEMENTATION

# NEEDED - Copy from CRITICAL_FIXES.md, section 1
```

✅ **Copy full implementation from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#1-fix-authservice-implementation-critical)**

---

## 2️⃣ Priority: ADD Missing Auth Endpoints (Backend)

**Status:** ❌ Missing endpoints  
**File:** `backend/app/api/routes/auth.py`  
**Problem:** Frontend calls 4 endpoints that don't exist → 404 errors

```python
# MISSING ENDPOINTS:
GET    /auth/me                      # Get user info
GET    /auth/sesiones                # Get sessions
POST   /auth/cerrar-todas-sesiones   # Close all sessions
POST   /auth/cambiar-password        # Change password
```

✅ **Copy all 4 endpoints from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#2-fix-missing-auth-endpoints-critical)**

---

## 3️⃣ Priority: ADD Similarity Function (Backend)

**Status:** ❌ Function called but doesn't exist  
**File:** `backend/app/services/embeddings.py`  
**Problem:** RAG queries crash when calculating similarity

```python
# CURRENT - BROKEN:
similitud = embedding_service.calcular_similitud_coseno(...)  # ❌ Method doesn't exist

# NEEDED - Add to EmbeddingService class:
@staticmethod
def calcular_similitud_coseno(embedding1, embedding2):
    # See CRITICAL_FIXES.md section 3
```

✅ **Copy method from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#3-fix-missing-similarity-function-critical)**

---

## 4️⃣ Priority: FIX ChatResponse (Backend)

**Status:** ❌ Missing field  
**File:** `backend/app/services/chat_handler.py`  
**Problem:** Response validation fails - missing `escalado` field

```python
# CURRENT - BROKEN:
return {
    "respuesta": ...,
    "intent": ...,
    "fragmentos_usados": ...,
    "tiempo_ms": ...,
    # ❌ MISSING: "escalado"
}

# NEEDED:
return {
    ...,
    "escalado": escalar,  # ← Add this line
}
```

✅ **One-line fix from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#4-fix-chat-response-missing-field-critical)**

---

## 5️⃣ Priority: IMPLEMENT Token Blacklist (Backend)

**Status:** ❌ Logout doesn't revoke tokens  
**File:** `backend/app/api/routes/auth.py`  
**Problem:** Tokens valid forever after logout - **SECURITY ISSUE**

```python
# CURRENT - BROKEN:
@router.post("/logout")
async def logout(...):
    # ❌ Token not added to blacklist
    # Users can still use token after logout

# NEEDED - See CRITICAL_FIXES.md section 5
```

✅ **Copy logout implementation from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#5-fix-token-blacklist-on-logout-critical)**

---

## 6️⃣ Priority: ADD Error Handler Middleware (Backend)

**Status:** ❌ Missing  
**File:** `backend/app/main.py`  
**Problem:** Unhandled exceptions return raw Python tracebacks to frontend

```python
# NEEDED - Add after CORS middleware:
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    # See CRITICAL_FIXES.md section 6
```

✅ **Copy middleware from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#6-fix-global-error-handler-middleware-critical)**

---

## 7️⃣ Priority: CREATE CourseContext (Frontend)

**Status:** ❌ Missing file  
**File:** `frontend/src/contexts/CourseContext.jsx`  
**Problem:** Chat page imports `useCourse()` from missing context → crashes

```javascript
// CURRENT - BROKEN:
import { useCourse } from '../contexts/CourseContext';
// ❌ File doesn't exist

// NEEDED - Create new file with CourseProvider and useCourse hook
```

✅ **Copy full file from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#9-fix-coursectx-implementation-critical---frontend)**

---

## 8️⃣ Priority: ADD Error Boundary (Frontend)

**Status:** ❌ Missing  
**File:** `frontend/src/components/ErrorBoundary.jsx`  
**Problem:** Single component error crashes entire app

```javascript
// NEEDED - Create new error boundary component
// Then wrap <AppRoutes /> with it in App.jsx
```

✅ **Copy component from [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#14-fix-add-error-boundary-component-frontend)**

---

## High Priority (Do After Blockers)

### Backend High Priority (2-3 hours)
- [ ] Fix CORS configuration (allow specific origins)
- [ ] Fix database connection pool
- [ ] Add input validation to endpoints
- [ ] Use pgvector for embeddings (not JSON)
- [ ] Add missing chat endpoints
- [ ] Add API functions for frontend

### Frontend High Priority (1-2 hours)
- [ ] Create `context.js` API functions
- [ ] Add API response validation
- [ ] Handle missing endpoints gracefully
- [ ] Create `.env` files

---

## IMPLEMENTATION CHECKLIST

### Step 1: Backend Critical Fixes (3-4 hours)
- [ ] Fix AuthService (B1)
- [ ] Add auth endpoints (B2)
- [ ] Add similarity function (B3)
- [ ] Fix ChatResponse (B4)
- [ ] Implement token blacklist (B5)
- [ ] Add error handler (B6)

### Step 2: Frontend Critical Fixes (1-2 hours)
- [ ] Create CourseContext (F1)
- [ ] Add error boundary (F2)
- [ ] Create context API functions

### Step 3: Backend High Priority (1-2 hours)
- [ ] Fix CORS
- [ ] Fix database pool
- [ ] Add validation
- [ ] Fix embeddings

### Step 4: Testing
- [ ] Test login/logout flow
- [ ] Test chat functionality
- [ ] Test error handling
- [ ] Test course enrollment

---

## Quick Test After Fixes

### Backend Test (5 min)
```bash
# Start server
python -m uvicorn app.main:app --reload

# Test in another terminal
curl http://localhost:8000/health
# Should return: {"status": "OK", "service": "Chatbot ITIL 4", "timestamp": "..."}
```

### Frontend Test (5 min)
```bash
# Start frontend
npm run dev

# Try to login
# Should NOT get 404 errors for /auth/me
```

---

## File Locations Summary

### Files to Create
- [ ] `frontend/src/contexts/CourseContext.jsx`
- [ ] `frontend/src/api/context.js`
- [ ] `frontend/src/components/ErrorBoundary.jsx`
- [ ] `backend/.env.example`
- [ ] `frontend/.env.example`

### Files to Modify
- [ ] `backend/app/core/security.py` - Complete AuthService
- [ ] `backend/app/api/routes/auth.py` - Add 4 endpoints
- [ ] `backend/app/services/embeddings.py` - Add similarity function
- [ ] `backend/app/services/chat_handler.py` - Fix response
- [ ] `backend/app/main.py` - Add error handler, fix CORS
- [ ] `backend/app/database/connection.py` - Fix pool config
- [ ] `backend/app/database/models.py` - Use pgvector
- [ ] `frontend/src/App.jsx` - Add ErrorBoundary

---

## Reference Documents

### For Detailed Implementation
1. **[COMPREHENSIVE_AUDIT.md](./COMPREHENSIVE_AUDIT.md)** - Full analysis of all issues
2. **[CRITICAL_FIXES.md](./CRITICAL_FIXES.md)** - Code samples for all fixes
3. **This file** - Quick reference for blockers

### Development

- Copy-paste ready code: [CRITICAL_FIXES.md](./CRITICAL_FIXES.md)
- Detailed issue analysis: [COMPREHENSIVE_AUDIT.md](./COMPREHENSIVE_AUDIT.md)

---

## Estimated Total Time to Production

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Phase 1 | Fix 8 critical blockers | 4-5 hrs | ← **START HERE** |
| Phase 2 | Fix high priority issues | 2-3 hrs | Next |
| Phase 3 | Testing & QA | 2-3 hrs | Then |
| Phase 4 | Documentation & Deployment | 1-2 hrs | Finally |

**Total: 9-13 hours** for one developer

**With team (2-3 devs): 3-5 hours**

---

## Need Help?

1. **Error at startup?** → Check Phase 1 fixes
2. **404 errors?** → Check missing endpoints in [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#2-fix-missing-auth-endpoints-critical)
3. **Chat crashes?** → Check similarity function in [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#3-fix-missing-similarity-function-critical)
4. **App crashes?** → Check ErrorBoundary in [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#14-fix-add-error-boundary-component-frontend)
5. **Login fails?** → Check AuthService in [CRITICAL_FIXES.md](./CRITICAL_FIXES.md#1-fix-authservice-implementation-critical)

---

**Document Status:** ✅ Complete Analysis  
**Last Updated:** May 14, 2026  
**Severity:** 🔴 CRITICAL - System not functional without fixes

