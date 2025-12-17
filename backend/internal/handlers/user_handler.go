package handlers

import (
	"net/http"
	"travel-blog-backend/internal/database"
	"travel-blog-backend/internal/models"
	"travel-blog-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) GetUsersCount(c *gin.Context) {
	var total int64
	if err := database.DB.Model(&models.User{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to count users"))
		return
	}
	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"total": total}))
}
