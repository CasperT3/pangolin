import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { roleActions } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const removeRoleActionParamsSchema = z.object({
    roleId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const removeRoleActionSchema = z.object({
    actionId: z.string(),
});

export async function removeRoleAction(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = removeRoleActionSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { actionId } = parsedParams.data;

        const parsedBody = removeRoleActionParamsSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { roleId } = parsedBody.data;

        // Check if the user has permission to remove role actions
        const hasPermission = await checkUserActionPermission(ActionsEnum.removeRoleAction, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        const deletedRoleAction = await db.delete(roleActions)
            .where(and(eq(roleActions.roleId, roleId), eq(roleActions.actionId, actionId)))
            .returning();

        if (deletedRoleAction.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Action with ID ${actionId} not found for role with ID ${roleId}`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Action removed from role successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}