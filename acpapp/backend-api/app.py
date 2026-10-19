from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db, disconnect_db, setup_db
from routes.auth import router as auth_router, setup_auth_security
from routes.items import router as items_router
from routes.products import router as products_router #the router has to be registered in app.py or you'll get 404 on every /api/products call.
from routes.billing import router as billing_router, setup_billing_tables
from routes.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await setup_db()
    await setup_auth_security()
    await setup_billing_tables()
    yield
    await disconnect_db()


app = FastAPI(title="ACP App API", lifespan=lifespan)

# Let the Next.js frontend (port 3000) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(items_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "ACP App API"}