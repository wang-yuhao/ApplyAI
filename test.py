from jose import jwt, JWTError
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImV4cCI6MTc2NzM2NzQ1OX0.ZsPw9DGgEy8-rL-0vFAm6IYtYk8AG6CDXQdflyTiCfk"
SECRET_KEY = "Q6gNO-Rb4gTk6lKpDoDUflXkwVfNdEgw9u8H1Tm8Zpg"

try:
    payload = jwt.decode(token, SECRET_KEY, algorithms="HS256")
    print("Success:", payload)
except JWTError as e:
    print("Error details:", str(e))  # This reveals the exact problem
