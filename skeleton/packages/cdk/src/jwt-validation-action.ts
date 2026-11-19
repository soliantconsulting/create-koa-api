import { type CfnListener, ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";

/**
 * Validates a JWT on the ALB before continuing with the next action.
 *
 * `ListenerAction.authenticateJwt()` only supports the issuer and JWKS endpoint, but not additional claims like the
 * audience. Without an audience check, any token issued by the same IdP tenant would be accepted. Replace this with
 * `ListenerAction.authenticateJwt()` once CDK supports additional claims.
 *
 * @see https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-verify-jwt.html
 */
export class JwtValidationAction extends ListenerAction {
    public constructor(config: CfnListener.JwtValidationConfigProperty, next: ListenerAction) {
        super({ type: "jwt-validation", jwtValidationConfig: config }, next);
    }
}
