# AdventureWorks Sales Dashboard

A professional sales performance dashboard built with React (frontend), Azure Functions (Node.js backend), and Azure SQL Database.


## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Azure account (for SQL Database and Functions)
- Git

### 1. Clone the repository
```sh
git clone https://github.com/Priyanshbro/adventureworks_sales_dashboard.git
cd adventureworks_sales_dashboard
```

### 2. Install dependencies
#### Frontend
```sh
cd sales-dashboard-auth
npm install
```
#### Backend
```sh
cd ../sales-api-2
npm install
```

### 3. Configure Azure SQL Connection
- Update `sales-api-2/local.settings.json` with your Azure SQL connection string under `ConnectionStrings:SQL_CONNECTION_STRING`.
- Ensure your database contains the required tables and stored procedures (see below).

### 4. Run locally
#### Start backend (Azure Functions)
```sh
cd sales-api-2
npm start
```
#### Start frontend (React)
```sh
cd ../sales-dashboard-auth
npm run dev
```
- Frontend will proxy API requests to backend at `http://localhost:7071`.

### 5. Deploy
- Use Azure Static Web Apps for frontend and Azure Functions for backend.
- See `.github/workflows/azure-static-web-apps-ambitious-wave-01146fd1e.yml` for CI/CD setup.

## Database Requirements
- Tables: `stg.Sales`, `stg.Salesperson`, `stg.Product`, etc.
- Stored Procedures: `GetTopSalesRepsByMonth`, `GetTotalSalesByMonth`, `GetSalesByRegionByMonth`, etc.

## Usage
- Login with username: `admin`, password: `password123` (default, can be changed in backend).
- Select a month to view sales KPIs and charts.

## Customization
- Update SQL procedures for custom metrics.
- Modify React components in `sales-dashboard-auth/src` for UI changes.

## License
MIT

## Author
Priyansh Pradhan
