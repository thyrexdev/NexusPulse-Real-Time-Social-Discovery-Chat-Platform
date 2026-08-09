📌 endpoints

POST /conversations
GET /conversations
GET /conversations/:id

📌 Business Rules

POST /conversations

↓

Validate DTO

↓

هل كل المستخدمين موجودين؟

↓

لا؟
404

↓

هل المستخدم بيحاول يكلم نفسه؟

↓

400

↓

هل PRIVATE؟

↓

آه

↓

هل فيه Conversation بنفس المشاركين؟

↓

آه

↓

رجعها

↓

لأ

↓

Create Conversation

↓

Insert Participants

↓

Return Conversation


📌 Database

📌 DTO

class CreateConversationDto {
  type: ConversationType;
  participantIds: string[];
}

📌 Service

📌 Controller

📌 Tests