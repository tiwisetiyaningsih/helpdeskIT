import { redis } from "./plugins/redis";

await redis.set("hello", "world");

const data = await redis.get("hello");

console.log(data);

process.exit();