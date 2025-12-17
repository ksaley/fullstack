package handlers

import (
	"errors"
	"net/http"
	"time"
	"travel-blog-backend/internal/database"
	"travel-blog-backend/internal/models"
	"travel-blog-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

type RegisterRequest struct {
	Email    string  `json:"email" binding:"required,email"`
	Username string  `json:"username" binding:"required,min=3,max=50"`
	Password string  `json:"password" binding:"required,min=6"`
	FirstName *string `json:"firstName"`
	LastName  *string `json:"lastName"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type TokenResponse struct {
	AccessToken  string      `json:"accessToken"`
	RefreshToken string      `json:"refreshToken"`
	User         models.User `json:"user"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request data: "+err.Error()))
		return
	}

	var existingUser models.User
	if err := database.DB.Where("email = ? OR username = ?", req.Email, req.Username).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, utils.ErrorResponse("user with this email or username already exists"))
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("failed to hash password"))
		return
	}

	user := models.User{
		Email:     req.Email,
		Username:  req.Username,
		Password:  hashedPassword,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Role:      models.RoleUser,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to create user"))
		return
	}

	accessToken, refreshToken, err := h.generateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to generate tokens"))
		return
	}

	user.Password = ""
	c.JSON(http.StatusCreated, utils.SuccessResponse(TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}))
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request data: "+err.Error()))
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse("invalid email or password"))
			return
		}
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("failed to find user"))
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("invalid email or password"))
		return
	}

	accessToken, refreshToken, err := h.generateTokens(user.ID, user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to generate tokens"))
		return
	}

	user.Password = ""
	c.JSON(http.StatusOK, utils.SuccessResponse(TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}))
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request data"))
		return
	}

	if err := database.DB.Where("token = ?", req.RefreshToken).Delete(&models.RefreshToken{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to logout"))
		return
	}

	c.JSON(http.StatusOK, utils.MessageResponse("Logged out successfully"))
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("User not authenticated"))
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID.(uint)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, utils.ErrorResponse("user not found"))
		} else {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to get user"))
		}
		return
	}
	user.Password = ""
	c.JSON(http.StatusOK, utils.SuccessResponse(user))
}

func (h *AuthHandler) generateTokens(userID uint, email, role string) (accessToken, refreshToken string, err error) {
	accessToken, err = utils.GenerateAccessToken(userID, email, role)
	if err != nil {
		return "", "", err
	}

	refreshToken, err = utils.GenerateRefreshToken(userID, email, role)
	if err != nil {
		return "", "", err
	}

	refreshTokenModel := models.RefreshToken{
		Token:     refreshToken,
		UserID:    userID,
		ExpiresAt: time.Now().Add(168 * time.Hour),
	}
	if err = database.DB.Create(&refreshTokenModel).Error; err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}
