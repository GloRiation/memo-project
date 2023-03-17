```typescript
import express from "express";

let app = express.Router();

app.post("/memos");

export default app;

export let skip = true;
```
