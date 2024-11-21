import express, { Request, Response } from "express";
import connectDB from "./config/dbConfig";
import authRouter from "./routes/authRoutes"
import profileRouter from "./routes/profileROutes"
import chatRouter from "./routes/chatRoutes"
import cors from "cors";
import { app, server } from "./config/socket";
import dotenv from "dotenv"
dotenv.config({})
// const app = express();
// app.use(cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"]
// }));
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});
app.get("/", (req, res) => {
    res.send("hii")
})
app.use(express.json())
app.get("/chat", (req: Request, res: Response) => {
    res.send("chat app")
});
app.use("/api/auth", authRouter)
app.use("/api/profile", profileRouter)
app.use("/api/chat", chatRouter)
connectDB().then(() => {
    server.listen(5000, () => {
        console.log('Server running on port 5000');
    });
})
