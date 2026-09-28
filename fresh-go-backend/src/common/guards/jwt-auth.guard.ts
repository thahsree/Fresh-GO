import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { Role } from "@prisma/client";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (err) {
      // In development mode, allow all endpoints with dev admin user context
      if (process.env.NODE_ENV !== "production") {
        const req = context.switchToHttp().getRequest();
        req.user = {
          id: "dev-admin-id",
          phone: "+919999999999",
          name: "FreshGo Admin",
          role: Role.ADMIN,
          isActive: true,
        };
        return true;
      }
      throw err;
    }
  }
}
