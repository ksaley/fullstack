package routes

import (
	"log"
	"net/http"
	"strings"
	"travel-blog-backend/internal/handlers"
	"travel-blog-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func SetupRoutes() *gin.Engine {
	router := gin.Default()

	router.Use(corsMiddleware())
	router.Use(errorHandler())

	authHandler := handlers.NewAuthHandler()
	postHandler := handlers.NewPostHandler()
	commentHandler := handlers.NewCommentHandler()
	userHandler := handlers.NewUserHandler()

	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authMiddleware(), authHandler.Logout)
			auth.GET("/me", authMiddleware(), authHandler.GetMe)
		}

		posts := api.Group("/posts")
		{
			posts.GET("", postHandler.GetPosts)
			posts.POST("", authMiddleware(), postHandler.CreatePost)
			posts.GET("/user/:userId", postHandler.GetPostsByUser)
			
			posts.GET("/:id", postHandler.GetPost)
			posts.PUT("/:id", authMiddleware(), postHandler.UpdatePost)
			posts.DELETE("/:id", authMiddleware(), postHandler.DeletePost)
		}

		comments := api.Group("/comments")
		{
			comments.GET("/count", commentHandler.GetCommentsCount)
			comments.GET("/post/:postId", commentHandler.GetComments)
			comments.POST("/post/:postId", authMiddleware(), commentHandler.CreateComment)
		}

		users := api.Group("/users")
		{
			users.GET("/count", userHandler.GetUsersCount)
		}
	}

	return router
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Authorization header required"))
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Invalid authorization header format"))
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("Invalid or expired token"))
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With",
		)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func errorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			log.Printf("Error: %v", err.Error())
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("Internal server error"))
		}
	}
}

