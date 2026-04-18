



# UniExchange

**A Dynamic Campus Freelance and Bidding Platform (DBMS Project)**

UniExchange is a robust, data-driven web application designed to connect university students for freelance tasks and peer-to-peer services. Built with a strong emphasis on Database Management System (DBMS) principles, the platform features a dynamic marketplace where the "market price" of a task fluctuates in real-time based on supply and demand (user bids).

## Cross-Platform Availability

UniExchange is architected to be fully responsive and cross-platform. 
* **Web:** Fully supported on all modern desktop and mobile browsers.
* **Android & iOS:** Available as native mobile applications utilizing optimized WebView wrappers, ensuring a seamless and consistent user experience across all devices.

## Application Preview

![UniExchange Demo Animation](docs/assets/demo.gif)
*(Placeholder: Replace with a GIF demonstrating the login, gig posting, and live bidding process)*

![Dashboard Interface](docs/assets/dashboard-screenshot.png)
*(Placeholder: Replace with a high-resolution screenshot of the marketplace and dynamic pricing interface)*

## Core Features

* **Dynamic Market Pricing:** Utilizes advanced SQL Views and aggregation functions to calculate the real-time market value of a gig based on the average of all submitted bids.
* **Concurrent Bidding System:** Allows multiple users to place bids on open gigs, with relational integrity ensuring users cannot bid on their own postings.
* **Gig Lifecycle Management:** Clients can post gigs, review incoming bids, and accept a bid, which triggers a state change closing the gig to further market activity.
* **Secure User Management:** Features secure authentication, session persistence, and profile management (including password modification via SQL `UPDATE` operations).
* **Asynchronous UI/UX:** Implements global loading states and asynchronous fetch requests to ensure the UI remains responsive during database transactions.

## Technology Stack

* **Backend Environment:** Node.js, Express.js
* **Database:** MySQL (Hosted via TiDB / Aiven Serverless)
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
* **Deployment:** Render (Web Service)

## Database Architecture

As a DBMS-centric project, the core logic resides within the relational structure and SQL operations.

### Tables

1. **`Users`**: Stores user credentials and profile information.
2. **`Gigs`**: Stores project details, base budget, and status (`open` or `closed`). Foreign key references the `Users` table (Client).
3. **`Bids`**: Records individual proposals. Foreign keys reference both `Gigs` and `Users` (Freelancer).

### The Dynamic Pricing View (`GigMarketStats`)

The hallmark of this DBMS implementation is the `GigMarketStats` view. Rather than calculating market averages on the application server, the database handles the aggregation natively, returning the dynamic price efficiently.

```sql
CREATE VIEW GigMarketStats AS
SELECT 
    g.id AS gig_id,
    g.title,
    g.description,
    g.base_budget,
    g.status,
    u.name AS client_name,
    COUNT(b.id) AS total_bids,
    COALESCE(AVG(b.amount), g.base_budget) AS dynamic_market_price
FROM Gigs g
JOIN Users u ON g.client_id = u.id
LEFT JOIN Bids b ON g.id = b.gig_id
GROUP BY g.id, g.title, g.description, g.base_budget, g.status, u.name;
```

## Local Installation and Setup

### Prerequisites
* Node.js (v16.x or higher)
* A MySQL Database (Local or Cloud-based like TiDB/Aiven)

### Step-by-Step Guide

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/uniexchange.git
   cd uniexchange
   ```

2. **Install dependencies:**
   Navigate to the backend directory and install required Node modules.
   ```bash
   cd backend
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the `backend` directory and add your MySQL connection string.
   ```env
   DATABASE_URL=mysql://username:password@host:port/database_name
   PORT=5000
   ```

4. **Initialize the Database:**
   Execute the provided SQL schema (found in `docs/schema.sql` or the documentation above) in your MySQL environment to create the required tables and views.

5. **Start the Application:**
   ```bash
   npm start
   ```
   The application will be accessible at `http://localhost:5000`.

## API Reference

The backend exposes a RESTful API communicating via JSON.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Creates a new user record. |
| `/api/auth/login` | `POST` | Authenticates a user and establishes a session. |
| `/api/auth/change-password`| `POST` | Updates the user's password payload. |
| `/api/gigs` | `POST` | Inserts a new gig into the database. |
| `/api/gigs` | `GET` | Fetches all open gigs using the `GigMarketStats` view. |
| `/api/gigs/my/:userId` | `GET` | Fetches gig history for a specific user. |
| `/api/bids` | `POST` | Registers a new bid on a specific gig. |
| `/api/bids/:gigId` | `GET` | Retrieves all bids associated with a specific gig. |
| `/api/gigs/accept` | `POST` | Updates gig status to `closed`. |

## License

This project is open-source and available under the [MIT License](LICENSE).

---
*Developed as a comprehensive Database Management System academic project.*
