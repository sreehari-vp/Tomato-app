import React, { useState, useContext } from "react";
import "./LoginPopup.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../Context/Storecontext";

const LoginPopup = ({ setShowLogin }) => {
  const { setUser } = useContext(StoreContext);
  const [currState, setCurrState] = useState("Sign Up");
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password } = formData;

    if (currState === "Sign Up" && !name) return alert("❌ Please enter your name");
    if (!email || !password) return alert("❌ Please enter email & password");

    setLoading(true);
    const endpoint = currState === "Sign Up" ? "/api/signup" : "/api/login";

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        alert(`✅ ${currState} successful!`);
        if (data.token) localStorage.setItem("token", data.token);
        setUser(data.customer);
        setShowLogin(false);
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert("❌ Server error");
    }
  };

  return (
    <div className="login-popup">
      <div className="login-popup-overlay" onClick={() => setShowLogin(false)} />
      <form className="login-popup-container" onSubmit={handleSubmit}>
        <div className="login-popup-header">
          <h2>{currState}</h2>
          <img
            src={assets.cross_icon}
            alt="Close"
            onClick={() => setShowLogin(false)}
          />
        </div>

        <div className="login-popup-inputs">
          {currState === "Sign Up" && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : currState === "Sign Up" ? "Create Account" : "Login"}
        </button>

        <p className="login-popup-switch">
          {currState === "Login"
            ? <>Don't have an account? <span onClick={() => setCurrState("Sign Up")}>Sign Up</span></>
            : <>Already have an account? <span onClick={() => setCurrState("Login")}>Login</span></>}
        </p>
      </form>
    </div>
  );
};

export default LoginPopup;
