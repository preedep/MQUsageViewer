# -------- STAGE 1: Build with Rust and musl for static binary --------
FROM rust:1.85-alpine as builder

# Install required build tools
RUN apk add --no-cache musl-dev openssl-dev pkgconfig build-base

# Set working directory
WORKDIR /app

# Pre-copy only dependency info for caching
COPY Cargo.toml Cargo.lock ./

# Create empty src to build deps
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Pre-build deps
RUN cargo build --release

# Now copy full source code
COPY ./src ./src

# Rebuild with actual sources
RUN cargo build --release

# -------- STAGE 2: Runtime with Alpine --------
FROM alpine:3.19

# Install runtime deps
RUN apk add --no-cache ca-certificates

# Set working directory
WORKDIR /app

# Copy compiled binary
COPY --from=builder /app/target/release/mqusageviewer /app/mqusageviewer

# Copy static files (HTML, CSS, JS)
COPY ./statics ./statics
COPY ./statics/index.html ./index.html
COPY ./statics/login.html ./login.html

# Copy dataset (SQLite DB file)
COPY ./datasets/mqdata.db ./datasets/mqdata.db

# Expose port (change if needed)
EXPOSE 8888

# Run binary
CMD ["./mqusageviewer"]