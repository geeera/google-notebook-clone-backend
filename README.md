# Backend for Chat PDF AI

## Overview

Backend server for a chat application with PDF upload capability, document indexing using LlamaIndex, document-based search, and real-time communication via WebSocket (socket.io).

---

## Technologies

- Node.js, Express
- MongoDB + Mongoose + GridFS for PDF storage
- LlamaIndex for PDF indexing and search
- Socket.io for real-time messaging
- PDF parsing with `pdf2json`

---

## Install dependencies

```bash
npm install
```

---

### Create a .env file with the following variables:

```
LLAMA_API_KEY=<your_api_key>
OPENAI_API_KEY=<your_api_key>
MONGO_DB_URI=<your_mongodb_connection_string>
OPENROUTER_API_KEY=<your_api_key>
```
---

## Commands

```bash
    npm run start
    npm run serve
    npm run build
```

---

## API Endpoints

```
POST /chat/upload — Upload a PDF file (multipart/form-data, field name: file)

GET /chat/:chatId/file — Retrieve the PDF file linked to a chat

WebSocket events:

join_chat — Join a chat room by chatId

send_message — Send a message in a chat (with chatId and text)

new_message — Server broadcasts new messages to all room participants
```



