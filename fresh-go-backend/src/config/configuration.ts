export default () => ({
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === "true",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "freshgo_dev_access_secret",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "freshgo_dev_refresh_secret",
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || "7d",
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "30d",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
    webhookSecret:
      process.env.RAZORPAY_WEBHOOK_SECRET || "placeholder_webhook_secret",
  },
  sms: {
    provider: process.env.SMS_PROVIDER || "mock",
    msg91AuthKey: process.env.MSG91_AUTH_KEY || "",
    msg91TemplateId: process.env.MSG91_OTP_TEMPLATE_ID || "",
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT || "",
    region: process.env.S3_REGION || "auto",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    bucket: process.env.S3_BUCKET_NAME || "freshgo-assets",
    publicDomain: process.env.S3_PUBLIC_DOMAIN || "https://assets.freshgo.in",
  },
  limits: {
    codCashLimit: parseFloat(process.env.COD_CASH_LIMIT || "2500"),
    dispatchTimeoutSeconds: parseInt(
      process.env.DISPATCH_TIMEOUT_SECONDS || "45",
      10,
    ),
    staleOrderTimeoutMinutes: parseInt(
      process.env.STALE_ORDER_TIMEOUT_MINUTES || "15",
      10,
    ),
  },
});
