package database

import (
	"log"
	"os"
	"travel-blog-backend/internal/config"

	"github.com/pressly/goose/v3"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	var err error
	
	dbLogger := logger.Default
	if config.AppConfig.Environment == "production" {
		dbLogger = logger.Default.LogMode(logger.Silent)
	}
	
	DB, err = gorm.Open(postgres.Open(config.AppConfig.DatabaseURL), &gorm.Config{
		Logger: dbLogger,
	})
	
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	
	log.Println("Database connected successfully")
}

func Migrate() {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get sql.DB:", err)
	}

	goose.SetDialect("postgres")

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		log.Fatal("MIGRATIONS_DIR is required")
	}

	if err := goose.Up(sqlDB, migrationsDir); err != nil {
		log.Fatal("Failed to apply migrations:", err)
	}

	log.Println("Database migrations applied successfully")
}

