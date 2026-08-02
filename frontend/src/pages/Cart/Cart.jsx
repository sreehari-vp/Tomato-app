import React, { useContext, useEffect, useState } from "react";
import "./Cart.css";
import { StoreContext } from "../../Context/storecontext";
import { useNavigate } from "react-router-dom";

const Cart = ({ setShowLogin }) => {
  const { cartItems, menuItems, removeFromCart, getTotalCartAmount, user } = useContext(StoreContext);
  const navigate = useNavigate();

  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("");

  const itemsInCart = menuItems.filter((item) => cartItems[item.item_id] > 0);
  const subtotal = getTotalCartAmount();
  const deliveryFee = subtotal > 0 ? 30 : 0;

  useEffect(() => {
    if (subtotal > 0 && user) {
      applyDiscount(); // automatically apply default discount
    }
  }, [subtotal, user]);

  const applyDiscount = async () => {
    if (subtotal === 0 || !user) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/apply-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.customer_id,
          coupon_code: couponCode, // can be empty for default discount
          subtotal,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDiscountAmount(Math.round(data.discount_amount));
        setFinalTotal(Math.round(data.final_total + deliveryFee));
        setMessage(data.message);
      } else {
        setMessage("Invalid or expired coupon!");
      }
    } catch (err) {
      console.error("Error applying discount:", err);
      setMessage("Something went wrong while applying discount.");
    }
  };

  const handleCheckout = () => {
    if (!user) {
      alert("❌ Please log in first!");
      setShowLogin(true);
      return;
    }

    sessionStorage.setItem(
      "cartItems",
      JSON.stringify(
        itemsInCart.map((item) => ({
          item_id: item.item_id,
          quantity: cartItems[item.item_id],
        }))
      )
    );
    sessionStorage.setItem("couponCode", couponCode.trim());
    sessionStorage.setItem("subtotal", Math.round(subtotal));
    sessionStorage.setItem("discountAmount", Math.round(discountAmount));
    sessionStorage.setItem("finalTotal", Math.round(finalTotal));
    navigate("/order");
  };

  return (
    <div className="cart">
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Item</p>
          <p>Name</p>
          <p>Price</p>
          <p>Qty</p>
          <p>Total</p>
          <p>Remove</p>
        </div>
      </div>
      <hr />

      {itemsInCart.map((item) => (
        <div key={item.item_id} className="cart-row">
          <div className="cart-items-title cart-items-item">
            <img src={item.image} alt="" />
            <p>{item.item_name}</p>
            <p>₹{item.price}</p>
            <p>{cartItems[item.item_id]}</p>
            <p>₹{item.price * cartItems[item.item_id]}</p>
            <p onClick={() => removeFromCart(item.item_id)} className="cross">×</p>
          </div>
          <hr />
        </div>
      ))}

      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Cart Totals</h2>
          <div className="cart-total-details"><p>Subtotal</p><p>₹{Math.round(subtotal)}</p></div>

          {discountAmount > 0 && (
            <div className="cart-total-details discount-line">
              <p>Discount Applied 🎉</p>
              <p>- ₹{discountAmount}</p>
            </div>
          )}

          <div className="cart-total-details"><p>Delivery Fee</p><p>₹{deliveryFee}</p></div>
          <hr />
          <div className="cart-total-details final-total">
            <b>Total Payable</b>
            <b>₹{finalTotal}</b>
          </div>

          <div className="coupon-box">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button onClick={applyDiscount}>Apply Coupon</button>
          </div>

          {message && <p className="coupon-message">{message}</p>}

          <button type="button" onClick={handleCheckout} className="checkout-btn">
            PROCEED TO CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
