import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Navbar from './Components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Cart from './pages/Cart/Cart';
import Placeorder from './pages/placeorder/placeorder';
import Orders  from './Components/Orders/orders';
import Footer from './Components/footer/footer';
import LoginPopup from './Components/LoginPopup/LoginPopup';
import StoreContextProvider from './Context/storecontext'; // 🔥

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <StoreContextProvider>
      {showLogin && <LoginPopup setShowLogin={setShowLogin} />}
      <div className="app">
        <Navbar setShowLogin={setShowLogin} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<Placeorder />} />
          <Route path="/orders" element={<Orders />} />   {/* 🔥 Add this */}
        </Routes>
      </div>
      <Footer />
    </StoreContextProvider>
  );
};

export default App;
