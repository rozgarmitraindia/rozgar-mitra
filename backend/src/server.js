import 'dotenv/config';
import dns from "node:dns";
import mongoose from "mongoose";
import app from "./app.js";
import { bootstrapAdmin } from "./utils/bootstrapAdmin.js";
import { initializeSocket } from "./utils/socket.js";
import { startInterviewReminderScheduler } from "./services/interviewReminder.service.js";

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
		console.log('Starting Rozgar Mitra API...');
		await mongoose.connect(process.env.MONGODB_URI);
		console.log(`MongoDB connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);

		await bootstrapAdmin();

		const server = app.listen(port, () => {
			console.log(`Rozgar Mitra API running on http://localhost:${port} (env=${process.env.NODE_ENV || 'development'})`);
		});
		server.on("error", (error) => {
			if (error.code === "EADDRINUSE") {
				console.error(`Port ${port} is already in use. Close the old backend terminal/process, then run npm run dev again.`);
			} else {
				console.error("HTTP server error:", error);
			}
			process.exit(1);
		});

		initializeSocket(server, (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((item) => item.trim().replace(/\/$/, "")));
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
