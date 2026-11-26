# FinTrack — Personal Finance & Savings Jars

FinTrack là ứng dụng web giúp theo dõi thu chi cá nhân, quản lý hạn mức ngân sách và lập các mục tiêu tiết kiệm theo từng “hũ”.

## Tính năng

- **Tổng quan tài chính:** xem thu nhập, chi tiêu, thặng dư và biểu đồ theo ngày, tháng hoặc năm.
- **Tóm tắt thông minh:** tổng hợp chi tiêu theo ngày, tuần, tháng hoặc năm; so sánh tổng tiền và từng danh mục với kỳ trước; nêu mức tăng/giảm, danh mục chi nhiều nhất và các danh mục mới phát sinh hoặc không còn chi. Có thể chọn trực tiếp ngày, tháng hoặc năm cần xem và quay lại hôm nay.
- **Giao dịch:** ghi nhận thu nhập/chi tiêu, chọn danh mục và thêm ghi chú.
- **Ngân sách:** thiết lập hạn mức theo ngày hoặc tháng, quản lý danh mục và thu nhập dự kiến.
- **Hũ tiết kiệm:** tạo mục tiêu, đặt hạn hoàn thành, nạp/rút tiền và cấu hình tỷ lệ trích tự động từ thu nhập.
- **Cá nhân hóa:** chọn màu chủ đạo, tải ảnh nền và chọn hiệu ứng hoa anh đào, tuyết rơi hoặc lá thu. Nhấp chuột phải vào hiệu ứng để chỉnh thông số. Có thể tải GIF/ảnh hiệu ứng riêng.

## Công nghệ

- **Frontend:** React 18, Vite, Tailwind CSS 4, React Router, TanStack Query.
- **Backend:** Java 21, Spring Boot, Spring Web MVC, Spring Data JPA.
- **Cơ sở dữ liệu backend:** SQL Server 

## Chạy frontend

Yêu cầu Node.js và npm.

```bash
cd Frontend
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, mặc định là <http://localhost:5173>.

Trên Windows PowerShell, nếu chính sách thực thi chặn `npm.ps1`, dùng lệnh `npm.cmd run dev` thay cho `npm run dev`.

Tạo bản build production:

```bash
cd Frontend
npm run build
```

## Chạy backend

Yêu cầu JDK 21, SQL Server đang chạy và Maven Wrapper có thể tải các dependency cần thiết.

1. Tạo database `personal_finance_db` trên SQL Server.
2. Tạo cấu hình local từ file mẫu `Backend/src/main/resources/application.example.properties` bằng cách sao chép thành `Backend/src/main/resources/application.properties`. File `application.properties` là cấu hình local và đã được ignore bởi Git.
3. Cung cấp các biến môi trường datasource trước khi chạy:
   - `SPRING_DATASOURCE_URL`
   - `SPRING_DATASOURCE_USERNAME`
   - `SPRING_DATASOURCE_PASSWORD`
   Không commit thông tin đăng nhập thật.
4. Chạy backend từ thư mục gốc:

```powershell
cd Backend
.\mvnw.cmd spring-boot:run
```

Backend mặc định lắng nghe tại <http://localhost:8080>. CORS hiện được cấu hình cho frontend chạy tại `http://localhost:5173`.

Có thể chạy kiểm thử backend bằng Maven Wrapper sau khi đã cấu hình database:

```powershell
cd Backend
.\mvnw.cmd test
```

## API hiện có

- `GET /api/categories` — lấy danh sách danh mục.
- `POST /api/categories` — tạo danh mục.
- `GET /api/transactions` — lấy danh sách giao dịch.
- `POST /api/transactions` — tạo giao dịch.
- `DELETE /api/transactions/{id}` — xóa giao dịch.

## Lưu trữ dữ liệu hiện tại

Ở phiên bản hiện tại, các màn hình frontend dùng dữ liệu mẫu và lưu giao dịch, ngân sách, danh mục, hũ tiết kiệm trong `localStorage` của trình duyệt. Frontend chưa kết nối các thao tác này với API Spring Boot/SQL Server; backend được chạy riêng. Vì vậy dữ liệu frontend được lưu theo trình duyệt và thiết bị, không tự đồng bộ giữa các máy.

Tóm tắt thông minh chỉ phân tích các giao dịch chi tiêu đã lưu trong trình duyệt. Các kỳ đang diễn ra được so sánh theo cùng khoảng thời gian đã trôi qua của kỳ trước; tuần bắt đầu từ thứ Hai. Giao dịch hiện chỉ lưu ngày, chưa lưu giờ, nên so sánh theo ngày là tổng cả ngày chứ không phải đến cùng thời điểm trong ngày. Khi kỳ trước chưa có khoản chi, ứng dụng hiển thị số tiền phát sinh mà không tính phần trăm tăng vô hạn.

Tùy chỉnh giao diện cũng được lưu trong trình duyệt. Tệp hiệu ứng tải lên được lưu trong IndexedDB; xóa dữ liệu trang web của trình duyệt có thể xóa các tùy chỉnh và dữ liệu này.

## Cấu trúc dự án

```text
Backend/   Spring Boot API và cấu hình SQL Server
Frontend/  React/Vite web application
```

## Lưu ý bảo mật

Không đưa thông tin đăng nhập cơ sở dữ liệu thật vào Git. Hãy dùng biến môi trường hoặc cấu hình riêng không được commit. Nếu thông tin đăng nhập trong cấu hình backend đã được push là thông tin đang sử dụng, hãy đổi mật khẩu và xử lý lịch sử Git để loại bỏ thông tin đó.
