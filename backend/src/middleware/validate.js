import { sendError } from "../utils/apiResponse.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return sendError(res, {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      });
    }

    req.validated = result.data;
    next();
  };
}
