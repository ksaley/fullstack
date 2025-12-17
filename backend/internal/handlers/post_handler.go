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

type PostHandler struct{}

func NewPostHandler() *PostHandler {
	return &PostHandler{}
}

type CreatePostRequest struct {
	Title    string  `json:"title" binding:"required"`
	Content  string  `json:"content" binding:"required"`
	Excerpt  *string `json:"excerpt"`
	ImageURL *string `json:"imageUrl"`
	Status   string  `json:"status"`
}

type UpdatePostRequest struct {
	Title    *string `json:"title"`
	Content  *string `json:"content"`
	Excerpt  *string `json:"excerpt"`
	ImageURL *string `json:"imageUrl"`
	Status   *string `json:"status"`
}

type PostListResponse struct {
	Posts      []models.Post `json:"posts"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	PageSize   int           `json:"pageSize"`
	TotalPages int           `json:"totalPages"`
}


func (h *PostHandler) checkPostPermission(c *gin.Context, post models.Post) bool {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	if post.UserID != userID.(uint) && userRole.(string) != "admin" {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("permission denied"))
		return false
	}
	return true
}

func (h *PostHandler) GetPosts(c *gin.Context) {
	h.getPostsWithFilter(c, database.DB.Model(&models.Post{}).Where("status = ?", models.StatusPublished))
}

func (h *PostHandler) GetPost(c *gin.Context) {
	id, ok := utils.ParseUintParam(c, "id", "Invalid post ID")
	if !ok {
		return
	}

	var post models.Post
	if err := database.DB.Preload("User").First(&post, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, utils.ErrorResponse("post not found"))
		} else {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to get post"))
		}
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(post))
}

func (h *PostHandler) CreatePost(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("User not authenticated"))
		return
	}

	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request data: "+err.Error()))
		return
	}

	status := models.StatusPublished
	if req.Status == "draft" {
		status = models.StatusDraft
	}

	post := models.Post{
		Title:    req.Title,
		Content:  req.Content,
		Excerpt:  req.Excerpt,
		ImageURL: req.ImageURL,
		UserID:   userID.(uint),
		Status:   status,
	}

	if err := database.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("failed to create post"))
		return
	}

	database.DB.Preload("User").First(&post, post.ID)
	c.JSON(http.StatusCreated, utils.SuccessResponse(post))
}

func (h *PostHandler) UpdatePost(c *gin.Context) {
	id, ok := utils.ParseUintParam(c, "id", "Invalid post ID")
	if !ok {
		return
	}

	var req UpdatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("Invalid request data"))
		return
	}

	var post models.Post
	if err := database.DB.First(&post, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, utils.ErrorResponse("post not found"))
		} else {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to get post"))
		}
		return
	}

	if !h.checkPostPermission(c, post) {
		return
	}

	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Content != nil {
		updates["content"] = *req.Content
	}
	if req.Excerpt != nil {
		updates["excerpt"] = req.Excerpt
	}
	if req.ImageURL != nil {
		updates["image_url"] = req.ImageURL
	}
	if req.Status != nil {
		if *req.Status == "draft" {
			updates["status"] = models.StatusDraft
		} else {
			updates["status"] = models.StatusPublished
		}
	}

	if err := database.DB.Model(&post).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to update post"))
		return
	}

	database.DB.Preload("User").First(&post, post.ID)
	c.JSON(http.StatusOK, utils.SuccessResponse(post))
}

func (h *PostHandler) DeletePost(c *gin.Context) {
	id, ok := utils.ParseUintParam(c, "id", "Invalid post ID")
	if !ok {
		return
	}

	var post models.Post
	if err := database.DB.First(&post, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, utils.ErrorResponse("post not found"))
		} else {
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to get post"))
		}
		return
	}

	if !h.checkPostPermission(c, post) {
		return
	}

	if err := database.DB.Delete(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to delete post"))
		return
	}

	c.JSON(http.StatusOK, utils.MessageResponse("Post deleted successfully"))
}

func (h *PostHandler) GetPostsByUser(c *gin.Context) {
	userID, ok := utils.ParseUintParam(c, "userId", "Invalid user ID")
	if !ok {
		return
	}
	h.getPostsWithFilter(c, database.DB.Model(&models.Post{}).Where("status = ? AND user_id = ?", models.StatusPublished, userID))
}

func (h *PostHandler) getPostsWithFilter(c *gin.Context, query *gorm.DB) {
	page, pageSize := utils.ParsePagination(c, 1, 10, 100)

	var posts []models.Post
	var total int64

	query.Count(&total)

	offset := (page - 1) * pageSize
	if err := query.Preload("User").
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("failed to get posts"))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(PostListResponse{
		Posts:      posts,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: utils.CalculateTotalPages(total, pageSize),
	}))
}
