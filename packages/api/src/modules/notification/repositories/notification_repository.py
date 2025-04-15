from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId

from core.base_repository import BaseRepository
from ..models.notification import Notification, NotificationStatus

class NotificationRepository(BaseRepository):
    def __init__(self, collection: AsyncIOMotorCollection):
        super().__init__(collection)
        self.collection = collection

    async def create(self, notification: Notification) -> Notification:
        notification_dict = notification.dict(by_alias=True)
        result = await self.collection.insert_one(notification_dict)
        notification.id = str(result.inserted_id)
        return notification

    async def get_by_id(self, notification_id: str) -> Optional[Notification]:
        result = await self.collection.find_one({"_id": ObjectId(notification_id)})
        if result:
            return Notification(**result)
        return None

    async def get_by_user_id(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Notification]:
        cursor = self.collection.find({"user_id": user_id})
        cursor = cursor.sort("created_at", -1).skip(skip).limit(limit)
        notifications = await cursor.to_list(length=limit)
        return [Notification(**notification) for notification in notifications]

    async def update(self, notification: Notification) -> Notification:
        notification_dict = notification.dict(by_alias=True)
        notification_dict["updated_at"] = datetime.now(timezone.UTC)
        
        await self.collection.update_one(
            {"_id": ObjectId(notification.id)},
            {"$set": notification_dict}
        )
        return notification

    async def delete(self, notification_id: str) -> bool:
        result = await self.collection.delete_one({"_id": ObjectId(notification_id)})
        return result.deleted_count > 0

    async def count_unread(self, user_id: str) -> int:
        return await self.collection.count_documents({
            "user_id": user_id,
            "is_read": False
        })

    async def mark_as_sent(self, notification_id: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(notification_id)},
            {
                "$set": {
                    "status": NotificationStatus.SENT,
                    "sent_at": datetime.now(timezone.UTC),
                    "updated_at": datetime.now(timezone.UTC)
                }
            }
        )
        return result.modified_count > 0

    async def get_pending_notifications(self, limit: int = 100) -> List[Notification]:
        cursor = self.collection.find({
            "status": NotificationStatus.PENDING
        }).sort("created_at", 1).limit(limit)
        
        notifications = await cursor.to_list(length=limit)
        return [Notification(**notification) for notification in notifications] 