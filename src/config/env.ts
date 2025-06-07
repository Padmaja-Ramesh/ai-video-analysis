import {z} from "zod";
import {Logger  } from "@/utils/logger";    

const logger = new Logger("config/env");

const envSchema = z.object({

    REACT_APP_GOOGLE_API_KEY: z.string(),
});
const validateEnv = () => {
    try {
        logger.info("Validating environment variables");
        const env ={
            REACT_APP_GOOGLE_API_KEY: process.env.REACT_APP_GOOGLE_API_KEY,
        }
        logger.debug("Environment variables", {
            REACT_APP_GOOGLE_API_KEY: !env.REACT_APP_GOOGLE_API_KEY 
        });
        const parsed = envSchema.parse(process.env);
        logger.info("Environment variables validated successfully");
        return parsed;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors.map((err) => err.path.join(".")).join(", ");
            logger.error("Invalid environment variables", {missingVars});
            throw new Error(`Invalid environment variables: ${missingVars}. Please check your .env file.`);
        }
        throw error;
    }
};

export const env = validateEnv();
