from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import secrets
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random
import httpx

# Nominatim geocoding cache to avoid repeated requests
geocode_cache = {}

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Create the main app
app = FastAPI(title="Tomibena CRM API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "agent"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class ClientCreate(BaseModel):
    name: str
    phone: str
    county: str
    city: str
    address: str
    cui: Optional[str] = None
    email: Optional[str] = None
    assigned_agent: Optional[str] = None

class ClientResponse(BaseModel):
    id: str
    name: str
    phone: str
    county: str
    city: str
    address: str
    cui: Optional[str] = None
    email: Optional[str] = None
    assigned_agent: Optional[str] = None
    created_at: str

class ProductCreate(BaseModel):
    name: str
    unit: str  # pallet/bag
    weight_per_unit: float
    current_stock: float = 0
    min_stock_alert: float
    purchase_cost: float
    sale_price: float

class ProductResponse(BaseModel):
    id: str
    name: str
    unit: str
    weight_per_unit: float
    current_stock: float
    min_stock_alert: float
    purchase_cost: float
    sale_price: float

class ReceiptCreate(BaseModel):
    product_id: str
    quantity: float
    invoice_nr: str
    cost: float

class OrderLineCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit_price: float

class OrderCreate(BaseModel):
    client_id: str
    channel: str  # online/phone/in-store
    payment_method: str  # card/cash-on-delivery/bank-transfer
    lines: List[OrderLineCreate]
    notes: Optional[str] = None
    delivery_type: str = "own_fleet"  # own_fleet/courier
    estimated_date: Optional[str] = None

class DeliveryCreate(BaseModel):
    order_id: str
    delivery_type: str  # own_fleet/courier
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    awb: Optional[str] = None
    estimated_date: str
    transport_cost: float = 0
    km: float = 0

class VehicleCreate(BaseModel):
    plate: str
    name: str
    max_kg: float
    fuel_consumption: float

class TargetCreate(BaseModel):
    agent_id: str
    target_type: str  # monthly/quarterly/annual
    value: float
    period: str  # e.g., "2024-01" for monthly

# Auth helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Nu sunteti autentificat")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token invalid")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizator negasit")
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirat")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalid")

def require_roles(allowed_roles: List[str]):
    async def role_checker(request: Request):
        user = await get_current_user(request)
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Acces interzis")
        return user
    return role_checker

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email deja inregistrat")
    
    hashed = hash_password(user_data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email, user_data.role)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": user_data.name, "role": user_data.role}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    email = credentials.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Email sau parola incorecta")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email sau parola incorecta")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user["role"])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": user["name"], "role": user["role"]}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Deconectat cu succes"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

# Users Routes (Admin only)
@api_router.get("/users")
async def get_users(user: dict = Depends(require_roles(["admin"]))):
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    return [{"id": str(u["_id"]), **{k: v for k, v in u.items() if k != "_id"}} for u in users]

@api_router.post("/users")
async def create_user(user_data: UserCreate, user: dict = Depends(require_roles(["admin"]))):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email deja inregistrat")
    
    hashed = hash_password(user_data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    return {"id": str(result.inserted_id), "email": email, "name": user_data.name, "role": user_data.role}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles(["admin"]))):
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilizator negasit")
    return {"message": "Utilizator sters"}

# Clients Routes
@api_router.get("/clients")
async def get_clients(request: Request):
    await get_current_user(request)
    clients = await db.clients.find({}, {"_id": 0, "id": {"$toString": "$_id"}}).to_list(1000)
    # Re-query properly
    clients = await db.clients.find().to_list(1000)
    return [{"id": str(c["_id"]), **{k: v for k, v in c.items() if k != "_id"}} for c in clients]

@api_router.post("/clients")
async def create_client(client_data: ClientCreate, request: Request):
    user = await get_current_user(request)
    client_doc = client_data.model_dump()
    client_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    if not client_doc.get("assigned_agent"):
        client_doc["assigned_agent"] = user["id"]
    result = await db.clients.insert_one(client_doc)
    return {"id": str(result.inserted_id), **client_doc}

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, request: Request):
    await get_current_user(request)
    client = await db.clients.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client negasit")
    return {"id": str(client["_id"]), **{k: v for k, v in client.items() if k != "_id"}}

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: ClientCreate, request: Request):
    await get_current_user(request)
    result = await db.clients.update_one(
        {"_id": ObjectId(client_id)},
        {"$set": client_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client negasit")
    return {"message": "Client actualizat"}

@api_router.get("/clients/{client_id}/orders")
async def get_client_orders(client_id: str, request: Request):
    await get_current_user(request)
    orders = await db.orders.find({"client_id": client_id}).to_list(1000)
    return [{"id": str(o["_id"]), **{k: v for k, v in o.items() if k != "_id"}} for o in orders]

@api_router.get("/clients/search/{phone}")
async def search_client_by_phone(phone: str, request: Request):
    await get_current_user(request)
    client = await db.clients.find_one({"phone": {"$regex": phone}})
    if not client:
        return None
    return {"id": str(client["_id"]), **{k: v for k, v in client.items() if k != "_id"}}

# Products Routes
@api_router.get("/products")
async def get_products(request: Request):
    await get_current_user(request)
    products = await db.products.find().to_list(1000)
    return [{"id": str(p["_id"]), **{k: v for k, v in p.items() if k != "_id"}} for p in products]

@api_router.post("/products")
async def create_product(product_data: ProductCreate, user: dict = Depends(require_roles(["admin"]))):
    product_doc = product_data.model_dump()
    result = await db.products.insert_one(product_doc)
    return {"id": str(result.inserted_id), **product_doc}

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductCreate, user: dict = Depends(require_roles(["admin"]))):
    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": product_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produs negasit")
    return {"message": "Produs actualizat"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_roles(["admin"]))):
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produs negasit")
    return {"message": "Produs sters"}

# Receipts Routes (increase stock)
@api_router.get("/receipts")
async def get_receipts(request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Acces interzis")
    receipts = await db.receipts.find().to_list(1000)
    return [{"id": str(r["_id"]), **{k: v for k, v in r.items() if k != "_id"}} for r in receipts]

@api_router.post("/receipts")
async def create_receipt(receipt_data: ReceiptCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    # Update product stock
    result = await db.products.update_one(
        {"_id": ObjectId(receipt_data.product_id)},
        {"$inc": {"current_stock": receipt_data.quantity}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produs negasit")
    
    # Get product name
    product = await db.products.find_one({"_id": ObjectId(receipt_data.product_id)})
    
    receipt_doc = receipt_data.model_dump()
    receipt_doc["product_name"] = product["name"] if product else "Unknown"
    receipt_doc["date"] = datetime.now(timezone.utc).isoformat()
    receipt_doc["created_by"] = user["id"]
    
    insert_result = await db.receipts.insert_one(receipt_doc)
    return {"id": str(insert_result.inserted_id), **receipt_doc}

# Orders Routes
@api_router.get("/orders")
async def get_orders(
    request: Request,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    agent_id: Optional[str] = None
):
    user = await get_current_user(request)
    query = {}
    if status:
        query["status"] = status
    if channel:
        query["channel"] = channel
    if agent_id:
        query["agent_id"] = agent_id
    
    # Agents see only their orders unless admin
    if user["role"] == "agent":
        query["agent_id"] = user["id"]
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    return [{"id": str(o["_id"]), **{k: v for k, v in o.items() if k != "_id"}} for o in orders]

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, request: Request):
    user = await get_current_user(request)
    
    # Calculate total
    total = sum(line.quantity * line.unit_price for line in order_data.lines)
    
    # Get client info
    client = await db.clients.find_one({"_id": ObjectId(order_data.client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client negasit")
    
    order_doc = {
        "client_id": order_data.client_id,
        "client_name": client["name"],
        "client_phone": client["phone"],
        "client_address": f"{client['address']}, {client['city']}, {client['county']}",
        "agent_id": user["id"],
        "agent_name": user["name"],
        "channel": order_data.channel,
        "payment_method": order_data.payment_method,
        "lines": [line.model_dump() for line in order_data.lines],
        "total": total,
        "notes": order_data.notes,
        "status": "new",
        "payment_status": "unpaid",
        "delivery_type": order_data.delivery_type,
        "estimated_date": order_data.estimated_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.orders.insert_one(order_doc)
    return {"id": str(result.inserted_id), **order_doc}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    await get_current_user(request)
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Comanda negasita")
    return {"id": str(order["_id"]), **{k: v for k, v in order.items() if k != "_id"}}

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    new_status = body.get("status")
    
    valid_statuses = ["new", "confirmed", "allocated", "in_transit", "delivered", "refused", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Status invalid")
    
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Comanda negasita")
    
    update_data = {"status": new_status}
    
    # If confirming, reduce stock
    if new_status == "confirmed" and order["status"] == "new":
        for line in order["lines"]:
            await db.products.update_one(
                {"_id": ObjectId(line["product_id"])},
                {"$inc": {"current_stock": -line["quantity"]}}
            )
    
    # If refused, return stock
    if new_status == "refused":
        for line in order["lines"]:
            await db.products.update_one(
                {"_id": ObjectId(line["product_id"])},
                {"$inc": {"current_stock": line["quantity"]}}
            )
    
    # If cancelled with card payment, set refund pending
    if new_status == "cancelled" and order["payment_method"] == "card":
        update_data["payment_status"] = "refund_pending"
    
    # If delivered, set as paid (unless already paid)
    if new_status == "delivered" and order["payment_status"] == "unpaid":
        update_data["payment_status"] = "paid"
    
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": update_data})
    return {"message": "Status actualizat", **update_data}

@api_router.patch("/orders/{order_id}/payment")
async def update_payment_status(order_id: str, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Doar adminul poate modifica statusul platii")
    
    body = await request.json()
    new_status = body.get("payment_status")
    
    valid_statuses = ["unpaid", "paid", "refund_pending", "refunded"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Status plata invalid")
    
    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"payment_status": new_status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comanda negasita")
    return {"message": "Status plata actualizat"}

# Deliveries Routes
@api_router.get("/deliveries")
async def get_deliveries(request: Request, driver_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if driver_id:
        query["driver_id"] = driver_id
    elif user["role"] == "driver":
        query["driver_id"] = user["id"]
    
    deliveries = await db.deliveries.find(query).to_list(1000)
    return [{"id": str(d["_id"]), **{k: v for k, v in d.items() if k != "_id"}} for d in deliveries]

@api_router.post("/deliveries")
async def create_delivery(delivery_data: DeliveryCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    # Get order info
    order = await db.orders.find_one({"_id": ObjectId(delivery_data.order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Comanda negasita")
    
    # Get vehicle info if provided
    vehicle_info = None
    if delivery_data.vehicle_id:
        vehicle = await db.vehicles.find_one({"_id": ObjectId(delivery_data.vehicle_id)})
        if vehicle:
            vehicle_info = {"plate": vehicle["plate"], "name": vehicle["name"]}
    
    # Get driver info if provided
    driver_info = None
    if delivery_data.driver_id:
        driver = await db.users.find_one({"_id": ObjectId(delivery_data.driver_id)})
        if driver:
            driver_info = {"name": driver["name"]}
    
    # Calculate fuel estimate
    fuel_estimate = 0
    if vehicle and delivery_data.km > 0:
        fuel_estimate = (delivery_data.km / 100) * vehicle.get("fuel_consumption", 0)
    
    delivery_doc = delivery_data.model_dump()
    delivery_doc["order_info"] = {
        "client_name": order.get("client_name"),
        "client_address": order.get("client_address"),
        "client_phone": order.get("client_phone"),
        "total": order.get("total")
    }
    delivery_doc["vehicle_info"] = vehicle_info
    delivery_doc["driver_info"] = driver_info
    delivery_doc["fuel_estimate"] = fuel_estimate
    delivery_doc["status"] = "pending"
    delivery_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.deliveries.insert_one(delivery_doc)
    
    # Update order status to allocated
    await db.orders.update_one(
        {"_id": ObjectId(delivery_data.order_id)},
        {"$set": {"status": "allocated"}}
    )
    
    return {"id": str(result.inserted_id), **delivery_doc}

@api_router.patch("/deliveries/{delivery_id}/status")
async def update_delivery_status(delivery_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    new_status = body.get("status")
    
    valid_statuses = ["pending", "in_transit", "delivered", "failed"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Status invalid")
    
    delivery = await db.deliveries.find_one({"_id": ObjectId(delivery_id)})
    if not delivery:
        raise HTTPException(status_code=404, detail="Livrare negasita")
    
    await db.deliveries.update_one(
        {"_id": ObjectId(delivery_id)},
        {"$set": {"status": new_status}}
    )
    
    # Update order status accordingly
    order_status_map = {
        "in_transit": "in_transit",
        "delivered": "delivered",
        "failed": "refused"
    }
    if new_status in order_status_map:
        await db.orders.update_one(
            {"_id": ObjectId(delivery["order_id"])},
            {"$set": {"status": order_status_map[new_status]}}
        )
    
    return {"message": "Status livrare actualizat"}

# Driver Routes
@api_router.get("/driver/today")
async def get_driver_today_deliveries(request: Request):
    user = await get_current_user(request)
    if user["role"] != "driver":
        raise HTTPException(status_code=403, detail="Acces doar pentru soferi")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    deliveries = await db.deliveries.find({
        "driver_id": user["id"],
        "estimated_date": {"$regex": f"^{today}"}
    }).to_list(100)
    
    return [{"id": str(d["_id"]), **{k: v for k, v in d.items() if k != "_id"}} for d in deliveries]

# Vehicles Routes
@api_router.get("/vehicles")
async def get_vehicles(request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Acces interzis")
    vehicles = await db.vehicles.find().to_list(100)
    return [{"id": str(v["_id"]), **{k: v for k, v in v.items() if k != "_id"}} for v in vehicles]

@api_router.post("/vehicles")
async def create_vehicle(vehicle_data: VehicleCreate, user: dict = Depends(require_roles(["admin"]))):
    vehicle_doc = vehicle_data.model_dump()
    result = await db.vehicles.insert_one(vehicle_doc)
    return {"id": str(result.inserted_id), **vehicle_doc}

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, user: dict = Depends(require_roles(["admin"]))):
    result = await db.vehicles.update_one(
        {"_id": ObjectId(vehicle_id)},
        {"$set": vehicle_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicul negasit")
    return {"message": "Vehicul actualizat"}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(require_roles(["admin"]))):
    result = await db.vehicles.delete_one({"_id": ObjectId(vehicle_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicul negasit")
    return {"message": "Vehicul sters"}

# Targets Routes
@api_router.get("/targets")
async def get_targets(request: Request, agent_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if agent_id:
        query["agent_id"] = agent_id
    elif user["role"] == "agent":
        query["agent_id"] = user["id"]
    
    targets = await db.targets.find(query).to_list(100)
    return [{"id": str(t["_id"]), **{k: v for k, v in t.items() if k != "_id"}} for t in targets]

@api_router.post("/targets")
async def create_target(target_data: TargetCreate, user: dict = Depends(require_roles(["admin"]))):
    # Get agent name
    agent = await db.users.find_one({"_id": ObjectId(target_data.agent_id)})
    
    target_doc = target_data.model_dump()
    target_doc["agent_name"] = agent["name"] if agent else "Unknown"
    target_doc["achieved"] = 0
    target_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.targets.insert_one(target_doc)
    return {"id": str(result.inserted_id), **target_doc}

@api_router.delete("/targets/{target_id}")
async def delete_target(target_id: str, user: dict = Depends(require_roles(["admin"]))):
    result = await db.targets.delete_one({"_id": ObjectId(target_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Target negasit")
    return {"message": "Target sters"}

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    
    # Get current month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Total orders this month
    orders = await db.orders.find({"created_at": {"$gte": month_start}}).to_list(10000)
    
    total_sales = sum(o.get("total", 0) for o in orders)
    total_orders = len(orders)
    
    # Orders by channel
    channel_stats = {"online": 0, "phone": 0, "in-store": 0}
    for o in orders:
        channel = o.get("channel", "phone")
        if channel in channel_stats:
            channel_stats[channel] += o.get("total", 0)
    
    # Orders by status
    status_stats = {}
    for o in orders:
        status = o.get("status", "new")
        status_stats[status] = status_stats.get(status, 0) + 1
    
    # Low stock products
    low_stock = await db.products.find({
        "$expr": {"$lt": ["$current_stock", "$min_stock_alert"]}
    }).to_list(100)
    
    # Refund pending orders
    refund_pending = await db.orders.find({"payment_status": "refund_pending"}).to_list(100)
    
    # Upsell alerts - clients who ordered last year this month but not this year
    last_year_month_start = (now.replace(year=now.year - 1, day=1, hour=0, minute=0, second=0, microsecond=0)).isoformat()
    last_year_month_end = (now.replace(year=now.year - 1, day=28, hour=23, minute=59, second=59)).isoformat()
    
    last_year_clients = await db.orders.distinct("client_id", {
        "created_at": {"$gte": last_year_month_start, "$lte": last_year_month_end}
    })
    
    this_year_clients = await db.orders.distinct("client_id", {
        "created_at": {"$gte": month_start}
    })
    
    upsell_client_ids = [c for c in last_year_clients if c not in this_year_clients]
    upsell_alerts = []
    for client_id in upsell_client_ids[:10]:
        client = await db.clients.find_one({"_id": ObjectId(client_id)})
        if client:
            upsell_alerts.append({
                "client_id": client_id,
                "client_name": client.get("name"),
                "client_phone": client.get("phone")
            })
    
    return {
        "total_sales": total_sales,
        "total_orders": total_orders,
        "channel_stats": channel_stats,
        "status_stats": status_stats,
        "low_stock": [{"id": str(p["_id"]), **{k: v for k, v in p.items() if k != "_id"}} for p in low_stock],
        "refund_pending": [{"id": str(o["_id"]), **{k: v for k, v in o.items() if k != "_id"}} for o in refund_pending],
        "upsell_alerts": upsell_alerts
    }

@api_router.get("/dashboard/monthly-sales")
async def get_monthly_sales(request: Request):
    await get_current_user(request)
    
    # Get last 6 months of sales
    now = datetime.now(timezone.utc)
    months_data = []
    
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_str = month_date.strftime("%Y-%m")
        month_name = month_date.strftime("%b")
        
        orders = await db.orders.find({
            "created_at": {"$regex": f"^{month_str}"}
        }).to_list(10000)
        
        total = sum(o.get("total", 0) for o in orders)
        months_data.append({"month": month_name, "sales": total})
    
    return months_data

# Get all drivers
@api_router.get("/drivers")
async def get_drivers(request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Acces interzis")
    
    drivers = await db.users.find({"role": "driver"}, {"password_hash": 0}).to_list(100)
    return [{"id": str(d["_id"]), **{k: v for k, v in d.items() if k != "_id"}} for d in drivers]

# Get all agents
@api_router.get("/agents")
async def get_agents(request: Request):
    user = await get_current_user(request)
    agents = await db.users.find({"role": "agent"}, {"password_hash": 0}).to_list(100)
    return [{"id": str(a["_id"]), **{k: v for k, v in a.items() if k != "_id"}} for a in agents]

# Geocoding function using Nominatim
async def geocode_address(address: str) -> Optional[dict]:
    """Geocode an address using Nominatim API"""
    if not address:
        return None
    
    # Check cache first
    cache_key = address.lower().strip()
    if cache_key in geocode_cache:
        return geocode_cache[cache_key]
    
    try:
        async with httpx.AsyncClient() as client:
            # Add Romania context for better results
            search_query = f"{address}, Romania"
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": search_query,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": "ro"
                },
                headers={
                    "User-Agent": "TomibenaCRM/1.0 (contact@tomibena.ro)"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                results = response.json()
                if results and len(results) > 0:
                    coords = {
                        "lat": float(results[0]["lat"]),
                        "lng": float(results[0]["lon"]),
                        "display_name": results[0].get("display_name", address)
                    }
                    geocode_cache[cache_key] = coords
                    return coords
    except Exception as e:
        logger.error(f"Geocoding error for '{address}': {e}")
    
    return None

# Geocode endpoint
@api_router.post("/geocode")
async def geocode_endpoint(request: Request):
    await get_current_user(request)
    body = await request.json()
    address = body.get("address", "")
    
    if not address:
        raise HTTPException(status_code=400, detail="Address required")
    
    coords = await geocode_address(address)
    if coords:
        return coords
    else:
        raise HTTPException(status_code=404, detail="Address not found")

# Batch geocode for multiple addresses
@api_router.post("/geocode/batch")
async def batch_geocode(request: Request):
    await get_current_user(request)
    body = await request.json()
    addresses = body.get("addresses", [])
    
    results = {}
    for addr in addresses:
        if addr:
            coords = await geocode_address(addr)
            if coords:
                results[addr] = coords
    
    return results

# Update delivery coordinates
@api_router.patch("/deliveries/{delivery_id}/coordinates")
async def update_delivery_coordinates(delivery_id: str, request: Request):
    await get_current_user(request)
    body = await request.json()
    lat = body.get("lat")
    lng = body.get("lng")
    
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="lat and lng required")
    
    result = await db.deliveries.update_one(
        {"_id": ObjectId(delivery_id)},
        {"$set": {"coordinates": {"lat": lat, "lng": lng}}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    return {"message": "Coordinates updated"}

# Include the router in the main app
app.include_router(api_router)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Seed data
async def seed_admin_and_demo_data():
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    
    # Seed demo agent
    agent_email = "ion.popescu@demo.ro"
    agent_exists = await db.users.find_one({"email": agent_email})
    agent_id = None
    if not agent_exists:
        result = await db.users.insert_one({
            "email": agent_email,
            "password_hash": hash_password("Agent123!"),
            "name": "Ion Popescu",
            "role": "agent",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        agent_id = str(result.inserted_id)
        logger.info("Demo agent created")
    else:
        agent_id = str(agent_exists["_id"])
    
    # Seed demo driver
    driver_email = "vasile.marin@demo.ro"
    driver_exists = await db.users.find_one({"email": driver_email})
    driver_id = None
    if not driver_exists:
        result = await db.users.insert_one({
            "email": driver_email,
            "password_hash": hash_password("Sofer123!"),
            "name": "Vasile Marin",
            "role": "driver",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        driver_id = str(result.inserted_id)
        logger.info("Demo driver created")
    else:
        driver_id = str(driver_exists["_id"])
    
    # Seed products
    products_exist = await db.products.count_documents({})
    if products_exist == 0:
        products = [
            {"name": "Peleți Premium", "unit": "palet", "weight_per_unit": 975, "current_stock": 50, "min_stock_alert": 10, "purchase_cost": 1200, "sale_price": 1450},
            {"name": "Peleți Standard", "unit": "palet", "weight_per_unit": 975, "current_stock": 80, "min_stock_alert": 15, "purchase_cost": 1000, "sale_price": 1250},
            {"name": "Brichete Rumeguș", "unit": "palet", "weight_per_unit": 960, "current_stock": 30, "min_stock_alert": 8, "purchase_cost": 900, "sale_price": 1150},
            {"name": "Brichete Cărbune", "unit": "sac", "weight_per_unit": 25, "current_stock": 200, "min_stock_alert": 50, "purchase_cost": 45, "sale_price": 65},
            {"name": "Lemne Fag", "unit": "metru ster", "weight_per_unit": 800, "current_stock": 100, "min_stock_alert": 20, "purchase_cost": 350, "sale_price": 480},
            {"name": "Lemne Stejar", "unit": "metru ster", "weight_per_unit": 900, "current_stock": 60, "min_stock_alert": 15, "purchase_cost": 400, "sale_price": 550},
            {"name": "Cărbune Lignit", "unit": "tonă", "weight_per_unit": 1000, "current_stock": 25, "min_stock_alert": 5, "purchase_cost": 800, "sale_price": 1100},
            {"name": "Cărbune Huila", "unit": "tonă", "weight_per_unit": 1000, "current_stock": 15, "min_stock_alert": 3, "purchase_cost": 1500, "sale_price": 2000}
        ]
        await db.products.insert_many(products)
        logger.info("Demo products created")
    
    # Seed vehicles
    vehicles_exist = await db.vehicles.count_documents({})
    if vehicles_exist == 0:
        vehicles = [
            {"plate": "SV-01-TMB", "name": "MAN TGX 18.440", "max_kg": 18000, "fuel_consumption": 32},
            {"plate": "SV-02-TMB", "name": "Volvo FH 460", "max_kg": 20000, "fuel_consumption": 30},
            {"plate": "SV-03-TMB", "name": "Mercedes Actros", "max_kg": 16000, "fuel_consumption": 28},
            {"plate": "SV-04-TMB", "name": "Iveco Daily", "max_kg": 3500, "fuel_consumption": 12}
        ]
        await db.vehicles.insert_many(vehicles)
        logger.info("Demo vehicles created")
    
    # Seed clients
    clients_exist = await db.clients.count_documents({})
    if clients_exist == 0:
        clients = [
            {"name": "SC Termo Construct SRL", "phone": "0744123456", "county": "Suceava", "city": "Suceava", "address": "Str. Mărășești 15", "cui": "RO12345678", "email": "contact@termoconstruct.ro", "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Asociația de Proprietari Nr. 25", "phone": "0755234567", "county": "Suceava", "city": "Rădăuți", "address": "Bd. Ștefan cel Mare 42", "cui": None, "email": "ap25radauti@gmail.com", "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Pensiunea Bucovina", "phone": "0766345678", "county": "Suceava", "city": "Vatra Dornei", "address": "Str. Republicii 8", "cui": "RO98765432", "email": "rezervari@pensiuneabucovina.ro", "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Gheorghe Andrei", "phone": "0733456789", "county": "Suceava", "city": "Fălticeni", "address": "Str. Sucevei 120", "cui": None, "email": None, "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Maria Ionescu", "phone": "0722567890", "county": "Suceava", "city": "Câmpulung Moldovenesc", "address": "Str. Calea Bucovinei 55", "cui": None, "email": "maria.ionescu@yahoo.com", "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Hotel & Spa Suceava", "phone": "0788678901", "county": "Suceava", "city": "Suceava", "address": "Bd. Ana Ipătescu 3", "cui": "RO55667788", "email": "receptie@hotelspasuceava.ro", "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "SC Mobilă Bucovina SRL", "phone": "0799789012", "county": "Suceava", "city": "Gura Humorului", "address": "Zona Industrială, Lot 12", "cui": "RO11223344", "email": "comenzi@mobilabucovina.ro", "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()},
            {"name": "Primăria Siret", "phone": "0230210100", "county": "Suceava", "city": "Siret", "address": "Str. Primăriei 1", "cui": "RO4356812", "email": "primaria@siret.ro", "assigned_agent": agent_id, "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        await db.clients.insert_many(clients)
        logger.info("Demo clients created")
    
    # Seed demo orders
    orders_exist = await db.orders.count_documents({})
    if orders_exist == 0:
        # Get client IDs
        all_clients = await db.clients.find().to_list(100)
        all_products = await db.products.find().to_list(100)
        
        if all_clients and all_products:
            # Generate orders for the last 6 months
            orders_to_insert = []
            for month_offset in range(6):
                order_date = datetime.now(timezone.utc) - timedelta(days=30 * month_offset)
                num_orders = random.randint(8, 15) if month_offset < 3 else random.randint(5, 10)
                
                for _ in range(num_orders):
                    client = random.choice(all_clients)
                    num_lines = random.randint(1, 3)
                    lines = []
                    total = 0
                    
                    for _ in range(num_lines):
                        product = random.choice(all_products)
                        qty = random.randint(1, 5)
                        price = product["sale_price"]
                        lines.append({
                            "product_id": str(product["_id"]),
                            "product_name": product["name"],
                            "quantity": qty,
                            "unit_price": price
                        })
                        total += qty * price
                    
                    channel = random.choice(["online", "phone", "phone", "phone", "in-store"])
                    payment = random.choice(["cash-on-delivery", "cash-on-delivery", "card", "bank-transfer"])
                    status = random.choice(["delivered", "delivered", "delivered", "confirmed", "new"])
                    payment_status = "paid" if status == "delivered" else "unpaid"
                    
                    order_created = order_date - timedelta(days=random.randint(0, 25))
                    
                    orders_to_insert.append({
                        "client_id": str(client["_id"]),
                        "client_name": client["name"],
                        "client_phone": client["phone"],
                        "client_address": f"{client['address']}, {client['city']}, {client['county']}",
                        "agent_id": agent_id,
                        "agent_name": "Ion Popescu",
                        "channel": channel,
                        "payment_method": payment,
                        "lines": lines,
                        "total": total,
                        "notes": None,
                        "status": status,
                        "payment_status": payment_status,
                        "delivery_type": "own_fleet",
                        "estimated_date": (order_created + timedelta(days=2)).strftime("%Y-%m-%d"),
                        "created_at": order_created.isoformat()
                    })
            
            await db.orders.insert_many(orders_to_insert)
            logger.info(f"Demo orders created: {len(orders_to_insert)}")
    
    # Seed demo deliveries
    deliveries_exist = await db.deliveries.count_documents({})
    if deliveries_exist == 0:
        all_orders = await db.orders.find({"status": {"$in": ["confirmed", "delivered"]}}).to_list(50)
        all_vehicles = await db.vehicles.find().to_list(10)
        
        if all_orders and all_vehicles and driver_id:
            deliveries_to_insert = []
            for order in all_orders[:20]:
                vehicle = random.choice(all_vehicles)
                delivery_status = "delivered" if order["status"] == "delivered" else random.choice(["pending", "in_transit"])
                
                deliveries_to_insert.append({
                    "order_id": str(order["_id"]),
                    "delivery_type": "own_fleet",
                    "driver_id": driver_id,
                    "vehicle_id": str(vehicle["_id"]),
                    "order_info": {
                        "client_name": order["client_name"],
                        "client_address": order["client_address"],
                        "client_phone": order["client_phone"],
                        "total": order["total"]
                    },
                    "vehicle_info": {"plate": vehicle["plate"], "name": vehicle["name"]},
                    "driver_info": {"name": "Vasile Marin"},
                    "awb": None,
                    "estimated_date": order.get("estimated_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                    "transport_cost": random.randint(100, 500),
                    "km": random.randint(20, 150),
                    "fuel_estimate": random.randint(5, 40),
                    "status": delivery_status,
                    "created_at": order["created_at"]
                })
            
            await db.deliveries.insert_many(deliveries_to_insert)
            logger.info(f"Demo deliveries created: {len(deliveries_to_insert)}")
    
    # Seed demo targets
    targets_exist = await db.targets.count_documents({})
    if targets_exist == 0:
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        current_quarter = f"{datetime.now(timezone.utc).year}-Q{(datetime.now(timezone.utc).month - 1) // 3 + 1}"
        current_year = str(datetime.now(timezone.utc).year)
        
        # Calculate achieved from orders
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_orders = await db.orders.find({"agent_id": agent_id, "created_at": {"$gte": month_start.isoformat()}}).to_list(1000)
        monthly_achieved = sum(o.get("total", 0) for o in monthly_orders)
        
        targets = [
            {"agent_id": agent_id, "agent_name": "Ion Popescu", "target_type": "monthly", "value": 50000, "period": current_month, "achieved": monthly_achieved, "created_at": datetime.now(timezone.utc).isoformat()},
            {"agent_id": agent_id, "agent_name": "Ion Popescu", "target_type": "quarterly", "value": 150000, "period": current_quarter, "achieved": monthly_achieved * 2.5, "created_at": datetime.now(timezone.utc).isoformat()},
            {"agent_id": agent_id, "agent_name": "Ion Popescu", "target_type": "annual", "value": 600000, "period": current_year, "achieved": monthly_achieved * 8, "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        
        await db.targets.insert_many(targets)
        logger.info("Demo targets created")
    
    # Seed demo receipts
    receipts_exist = await db.receipts.count_documents({})
    if receipts_exist == 0:
        all_products = await db.products.find().to_list(100)
        
        if all_products:
            receipts_to_insert = []
            for i, product in enumerate(all_products[:5]):
                receipt_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
                receipts_to_insert.append({
                    "product_id": str(product["_id"]),
                    "product_name": product["name"],
                    "quantity": random.randint(10, 50),
                    "invoice_nr": f"FV-2024-{1000 + i}",
                    "cost": random.randint(5000, 30000),
                    "date": receipt_date.isoformat(),
                    "created_by": agent_id
                })
            
            await db.receipts.insert_many(receipts_to_insert)
            logger.info("Demo receipts created")
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials for Tomibena CRM

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Agent Account
- Email: ion.popescu@demo.ro
- Password: Agent123!
- Role: agent

## Driver Account
- Email: vasile.marin@demo.ro
- Password: Sofer123!
- Role: driver

## Auth Endpoints
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/me
""")
    logger.info("Test credentials written to /app/memory/test_credentials.md")

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await seed_admin_and_demo_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
