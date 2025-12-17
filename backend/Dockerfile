FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN apk add --no-cache git && go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/travel-blog-backend ./cmd

FROM alpine:3.20
RUN addgroup -g 1000 appuser \
  && adduser -D -u 1000 -G appuser appuser
WORKDIR /app
COPY --from=builder /out/travel-blog-backend ./travel-blog-backend
COPY --from=builder /app/migrations ./migrations
USER appuser
CMD ["./travel-blog-backend"]
