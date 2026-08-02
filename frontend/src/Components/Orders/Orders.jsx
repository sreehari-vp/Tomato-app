import React, { useEffect, useState, useContext } from "react";
import "./Orders.css";
import { StoreContext } from "../../Context/Storecontext";

const Orders = () => {
  const { user } = useContext(StoreContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const loadOrders = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${user.customer_id}`);
    const data = await response.json();
    if (data.success) setOrders(data.orders);
  };

  return (
    <div className="orders-page">
      <h2>Your Orders</h2>

      {orders.length === 0 && <p className="no-orders">No orders yet.</p>}

      {orders.map((order) => (
        <div key={order.order_id} className="order-card">

          {/* Header */}
          <div className="order-header">
            <div>
              <h3>Order #{order.order_id}</h3>
              <p className="date">
                {new Date(order.order_time).toLocaleString()}
              </p>
            </div>

            <span className={`status-badge ${order.status.toLowerCase()}`}>
              {order.status}
            </span>
          </div>

          {/* Items */}
          <div className="order-items">
            {order.items.map((item, index) => (
              <div className="order-item" key={index}>
                <img src={item.image} alt={item.item_name} />

                <div className="item-info">
                  <p className="item-name">{item.item_name}</p>
                  <small className="qty">Qty: {item.quantity}</small>
                </div>

                <p className="item-price">₹{item.price * item.quantity}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="order-total-wrapper">
            <div className="order-total-line">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>

            <div className="order-total-line">
              <span>Discount</span>
              <span>-₹{order.discount_amount}</span>
            </div>

            <div className="order-total-line total-amount">
              <span>Total Paid</span>
              <span>₹{order.total_amount}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="order-footer">
            <button className="reorder-btn">Reorder</button>
            <button className="track-btn">Track Order</button>
          </div>

        </div>
      ))}
    </div>
  );
};

export default Orders;
