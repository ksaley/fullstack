package utils

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ParsePagination(c *gin.Context, defaultPage, defaultPageSize, maxPageSize int) (page int, pageSize int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", strconv.Itoa(defaultPage)))
	pageSize, _ = strconv.Atoi(c.DefaultQuery("pageSize", strconv.Itoa(defaultPageSize)))

	if page < 1 {
		page = defaultPage
	}
	if pageSize < 1 || pageSize > maxPageSize {
		pageSize = defaultPageSize
	}

	return page, pageSize
}

func ParseUintParam(c *gin.Context, name string, message string) (value uint, ok bool) {
	raw := c.Param(name)
	n, err := strconv.ParseUint(raw, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse(message))
		return 0, false
	}
	return uint(n), true
}

func CalculateTotalPages(total int64, pageSize int) int {
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	return totalPages
}


