import 'dotenv/config';
import dns from "node:dns";
import mongoose from "mongoose";
import app from "./app.js";
import { bootstrapAdmin } from "./utils/bootstrapAdmin.js";
import { initializeSocket } from "./utils/socket.js";
import { startInterviewReminderScheduler } from "./services/interviewReminder.service.js";
import { validateEnvironment } from "./utils/env.js";

const port = process.env.PORT || 5000;

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
	process.exit(1);
});

// Some local DNS resolvers refuse MongoDB Atlas SRV lookups. Configure Node's
// resolver before Mongoose expands a mongodb+srv connection string.
const mongoDnsServers = (process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8")
	.split(",")
	.map((server) => server.trim())
	.filter(Boolean);

if (mongoDnsServers.length) {
	dns.setServers(mongoDnsServers);
}

async function start() {
	try {
		validateEnvironment();
		console.log('Starting Rozgar Mitra API...');
		await mongoose.connect(process.env.MONGODB_URI, {
			serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
			maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 20),
			minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
		});
		console.log(`MongoDB connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);

		await bootstrapAdmin();

		const server = app.listen(port, () => {
			console.log(`Rozgar Mitra API running on http://localhost:${port} (env=${process.env.NODE_ENV || 'development'})`);
		});
		server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 120000);
		server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 65000);
		server.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 60000);
		server.on("error", (error) => {
			if (error.code === "EADDRINUSE") {
				console.error(`Port ${port} is already in use. Close the old backend terminal/process, then run npm run dev again.`);
			} else {
				console.error("HTTP server error:", error);
			}
			process.exit(1);
		});

		const socketOrigins = `https://rozgarmitra-india.netlify.app,http://localhost:5173,http://localhost:5174,${process.env.FRONTEND_URL || ""},${process.env.CORS_ORIGINS || ""}`
			.split(",")
			.map((item) => item.trim().replace(/\/$/, ""))
			.filter(Boolean);
		initializeSocket(server, socketOrigins);
		startInterviewReminderScheduler();

		mongoose.connection.on('error', (err) => {
			console.error('MongoDB connection error:', err);
		});

		const graceful = (signal) => {
			console.log(`Received ${signal} - closing server...`);
			server.close(async () => {
				try {
					await mongoose.disconnect();
					console.log('MongoDB disconnected');
					process.exit(0);
				} catch (e) {
					console.error('Error during shutdown', e);
					process.exit(1);
				}
			});
			// Force exit if shutdown takes too long
			setTimeout(() => {
				console.error('Forcing exit after timeout');
				process.exit(1);
			}, 10000).unref();
		};

		process.on('SIGINT', () => graceful('SIGINT'));
		process.on('SIGTERM', () => graceful('SIGTERM'));
	} catch (err) {
		console.error('Failed to start server:', err);
		process.exit(1);
	}
}

start();
