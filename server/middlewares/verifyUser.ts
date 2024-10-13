import { NextFunction, Response } from "express";
import ErrorResponse from "@server/types/ErrorResponse";
import { unauthorized, verifySession } from "@server/auth";
import { db } from "@server/db";
import { users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";

export const verifySessionUserMiddleware = async (
    req: any,
    res: Response<ErrorResponse>,
    next: NextFunction,
) => {
    const { session, user } = await verifySession(req);
    if (!session || !user) {
        return next(unauthorized());
    }

    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, user.userId));

    if (!existingUser || !existingUser[0]) {
        return next(
            createHttpError(HttpCode.BAD_REQUEST, "User does not exist"),
        );
    }

    req.user = existingUser[0];
    req.session = session;

    if (!existingUser[0].emailVerified) {
        return next(
            createHttpError(HttpCode.BAD_REQUEST, "Email is not verified"), // Might need to change the response type?
        );
    }

    next();
};
