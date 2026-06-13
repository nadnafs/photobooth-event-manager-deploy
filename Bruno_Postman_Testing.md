# Panduan Testing API Auth Menggunakan Postman / Bruno

## 1. Login Endpoint
- **URL**: `http://localhost:3000/api/auth/login`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
- **Body** (Raw JSON):
  ```json
  {
    "username": "kasir",
    "password": "kasir123"
  }
  ```
  *(Atau gunakan `"username": "penerima"`, `"password": "penerima123"`)*
- **Expected Response (200 OK)**:
  ```json
  {
    "message": "Login berhasil",
    "token": "eyJhbGciOiJIUz...",
    "user": {
      "id": "uuid-here",
      "username": "kasir",
      "name": "Admin Kasir",
      "role": "KASIR"
    }
  }
  ```

## 2. Get Me Endpoint (Membutuhkan JWT)
- **URL**: `http://localhost:3000/api/auth/me`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <TOKEN_DARI_LOGIN>`
- **Expected Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "uuid-here",
      "username": "kasir",
      "name": "Admin Kasir",
      "role": "KASIR",
      "created_at": "2026-05-27T00:00:00.000Z"
    }
  }
  ```
