import React, { useContext, useState, useEffect } from "react";
import "./Placeorder.css";
import { StoreContext } from "../../Context/storecontext";
import { useNavigate } from "react-router-dom";

const Placeorder = () => {
  const { clearCart, user } = useContext(StoreContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", street: "",
    city: "", state: "", zip: "", country: "", phone: "",
  });

  const [cartItemsArray, setCartItemsArray] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    const cart = JSON.parse(sessionStorage.getItem("cartItems") || "[]");
    if (cart.length === 0) {
      alert("❌ Your cart is empty!");
      navigate("/");
      return;
    }
    setCartItemsArray(cart);
    setSubtotal(Number(sessionStorage.getItem("subtotal") || 0));
    setDiscountAmount(Number(sessionStorage.getItem("discountAmount") || 0));
    setFinalTotal(Number(sessionStorage.getItem("finalTotal") || subtotal + 30));
  }, [navigate, subtotal]);

  const handleChange = e =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePlaceOrder = async e => {
    e.preventDefault();

    if (!user) {
      alert("❌ You must log in to place an order!");
      navigate("/");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Your login session is missing. Please log in again.");
      navigate("/");
      return;
    }

    const required = ["firstName","lastName","street","city","state","zip","country","phone"];
    for (let f of required) if (!formData[f].trim()) return alert(`❌ Fill ${f}`);

    const deliveryAddress = `${formData.street}, ${formData.city}, ${formData.state}, ${formData.country} - ${formData.zip}`;

    const couponCode = sessionStorage.getItem("couponCode") || "";
    const orderData = {
      delivery_address: deliveryAddress,
      cartItems: cartItemsArray.map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity,
      })),
    };

    if (couponCode.trim()) {
      orderData.coupon_code = couponCode.trim();
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/placeorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Order placed successfully!");
        clearCart();
        sessionStorage.removeItem("cartItems");
        sessionStorage.removeItem("couponCode");
        navigate("/");
      } else {
        alert("❌ Failed to place order: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Server error while placing order");
    }
  };

  return (
    <form className="place-order" onSubmit={handlePlaceOrder}>
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="multi-fields">
          <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} />
          <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} />
        </div>
        <input name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
        <input name="street" placeholder="Street" value={formData.street} onChange={handleChange} />
        <div className="multi-fields">
          <input name="city" placeholder="City" value={formData.city} onChange={handleChange} />
          <input name="state" placeholder="State" value={formData.state} onChange={handleChange} />
        </div>
        <div className="multi-fields">
          <input name="zip" placeholder="Zip" value={formData.zip} onChange={handleChange} />
          <input name="country" placeholder="Country" value={formData.country} onChange={handleChange} />
        </div>
        <input name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} />
      </div>

      <div className="place-order-right">
        <div className="cart-total">
          <h2>Cart Totals</h2>
          <div className="cart-total-details"><p>Subtotal</p><p>₹{subtotal}</p></div>
          {discountAmount > 0 && <div className="cart-total-details"><p>Discount</p><p>- ₹{discountAmount}</p></div>}
          <div className="cart-total-details"><p>Delivery Fee</p><p>₹30</p></div>
          <div className="cart-total-details"><b>Total</b><b>₹{finalTotal}</b></div>
          <button type="submit">PROCEED TO PAYMENT</button>
        </div>
      </div>
    </form>
  );
};

export default Placeorder;
