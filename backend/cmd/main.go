package main

import (
	"log"
	"travel-blog-backend/internal/config"
	"travel-blog-backend/internal/database"
	"travel-blog-backend/internal/routes"
)

func main() {

	config.LoadConfig()
	database.Connect()
	database.Migrate()
	router := routes.SetupRoutes()

	
	log.Printf("Server starting on port %s", config.AppConfig.Port)
	if err := router.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

