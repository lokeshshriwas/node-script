function asyncHandler(routeHandler) {
    return async (req, res, next) => {
      try {
        await routeHandler(req, res, next);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    };
  }

module.exports = asyncHandler