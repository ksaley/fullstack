package handlers

import (
	"errors"
	"net/http"
	"travel-blog-backend/internal/database"
	"travel-blog-backend/internal/models"
	"travel-blog-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CommentHandler struct{}

func NewCommentHandler() *CommentHandler {
	return &CommentHandler{}
}

type CreateCommentRequest struct {
	Content  string `json:"content" binding:"required"`
	ParentID *uint  `json:"parentId"`
}

type CommentListResponse struct {
	Comments   []models.Comment `json:"comments"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	PageSize   int              `json:"pageSize"`
	TotalPages int              `json:"totalPages"`
}

func (h *CommentHandler) GetCommentsCount(c *gin.Context) {
	var total int64
	if err := database.DB.Model(&models.Comment{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to count comments"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"total": total}))
}

func (h *CommentHandler) GetComments(c *gin.Context) {
	postID, ok := utils.ParseUintParam(c, "postId", "Invalid post ID")
	if !ok {
		return
	}

	page, pageSize := utils.ParsePagination(c, 1, 10, 100)

	var comments []models.Comment
	var total int64

	query := database.DB.Model(&models.Comment{}).Where("post_id = ? AND parent_id IS NULL", postID)
	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Preload("User").
		Preload("Replies", func(db *gorm.DB) *gorm.DB {
			return db.Preload("User").Order("created_at ASC")
		}).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to get comments"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(CommentListResponse{
		Comments:   comments,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: utils.CalculateTotalPages(total, pageSize),
	}))
}

func (h *CommentHandler) CreateComment(c *gin.Context) {
	postID, ok := utils.ParseUintParam(c, "postId", "Invalid post ID")
	if !ok {
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("User not authenticated"))
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request data: "+err.Error()))
		return
	}

	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, utils.ErrorResponse("post not found"))
		} else {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to get post"))
		}
		return
	}

	comment := models.Comment{
		Content:  req.Content,
		PostID:   postID,
		UserID:   userID.(uint),
		ParentID: req.ParentID,
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to create comment"))
		return
	}

	database.DB.Preload("User").Preload("Post").First(&comment, comment.ID)
	c.JSON(http.StatusCreated, utils.SuccessResponse(comment))
}
