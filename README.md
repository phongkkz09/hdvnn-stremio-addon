# HDvnn Stremio Addon

Addon Stremio cho phép xem phim từ HDvnn.xyz - trang phim Việt Nam với anime và hoạt hình Trung Quốc.

## Cài đặt

### Sử dụng trực tiếp
Mở link này trong Stremio:
```
stremio://YOUR-RENDER-URL/manifest.json
```

### Deploy lên Render

1. Fork hoặc clone repo này
2. Đăng nhập [Render](https://render.com)
3. Tạo mới **Web Service**
4. Connect với GitHub repo
5. Render sẽ tự động detect `render.yaml`
6. Deploy!

## Tính năng

- ✅ Phim lẻ Việt Nam và quốc tế
- ✅ Phim bộ, series
- ✅ Anime Nhật Bản
- ✅ Hoạt hình Trung Quốc
- ✅ Tìm kiếm phim
- ✅ Streaming trực tiếp

## API Endpoints

- `GET /manifest.json` - Addon manifest
- `GET /catalog/:type/:id.json` - Danh sách phim
- `GET /meta/:type/:id.json` - Chi tiết phim
- `GET /stream/:type/:id.json` - Stream URL

## Phát triển local

```bash
npm install
npm start
```

Mở http://localhost:7000 để xem trang cài đặt.

## Lưu ý

Addon này được phát triển để sử dụng cá nhân. Nội dung thuộc về HDvnn.xyz.
