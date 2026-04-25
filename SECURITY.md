# Security Policy

## Authentication and Authorization

SplitLedger uses stateless JSON Web Tokens (JWT) for user authentication.

### Token Handling
1. **Access Tokens**: Short-lived (e.g., 15 minutes) JWTs used for API access. Passed explicitly by the frontend via the `Authorization: Bearer <token>` header.
2. **Refresh Tokens**: Long-lived cryptographic strings stored securely in the database, allowing access tokens to be rotated automatically. Passed securely in request bodies.
3. **Session Management**: Active sessions, identified by refresh token families, can be reviewed and revoked individually or across all devices from the user's dashboard.
4. **Token Rotation and Family Invalidation**: The system enforces Refresh Token Rotation. If an already-used refresh token is presented again, the system treats it as a theft event and automatically revokes the entire token family, immediately logging out all associated sessions.

## Cross-Site Request Forgery (CSRF) Protection

SplitLedger is **inherently protected against CSRF attacks** through its architectural choices:

1. **No Cookie-Based Auth for APIs**: The application does not rely on ambient authority (like cookies) for API requests.
2. **Bearer Token Strategy**: Because the frontend explicitly attaches the JWT to the `Authorization: Bearer <token>` header, malicious third-party sites cannot forge requests on behalf of the user. The browser will not automatically send the token with cross-site requests.
3. **Conclusion**: Double-submit CSRF cookies or token middleware (like `csurf`) are not required for this API design.

## Two-Factor Authentication (2FA)

SplitLedger supports TOTP-based Two-Factor Authentication (e.g., via Google Authenticator, Authy).
- Recovery Codes: Generated using SHA-256 hashing.
- Setup Secrets: Temporary state is held in Redis, ensuring atomic and uncompromised setup flow.

## Reporting Vulnerabilities
If you discover a security vulnerability within SplitLedger, please open a secure advisory or contact the repository maintainers directly.
