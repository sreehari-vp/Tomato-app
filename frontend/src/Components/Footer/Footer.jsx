import React, { useState, useEffect } from 'react';
import './Footer.css';
import { assets } from '../../assets/assets';

const Footer = () => {
  const [showTopBtn, setShowTopBtn] = useState(false);

  // Show scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className='footer' id='footer'>
      <div className="footer-content">
        <div className="footer-content-left">
          <img src={assets.logo} alt="Logo" />
          <p>"Tomato is your go-to online food delivery platform. We bring fresh, delicious meals from your favorite restaurants straight to your doorstep, fast and hassle-free. Quality, taste, and convenience—always."</p>
          <div className="footer-social-icons">
            <img src={assets.facebook_icon} alt="Facebook" />
            <img src={assets.twitter_icon} alt="Twitter" />
            <img src={assets.linkedin_icon} alt="LinkedIn" />
          </div>
        </div>

        <div className="footer-content-center">
          <h2>COMPANY</h2>
          <ul>
            <li>Home</li>
            <li>About us</li>
            <li>Delivery</li>
            <li>Privacy policy</li>
          </ul>
        </div>

        <div className="footer-content-right">
          <h2>GET IN TOUCH</h2>
          <ul>
            <li>+1-212-456-7899</li>
            <li>contact@tomato.com</li>
          </ul>
        </div>
      </div>

      <hr />
      <p className="footer-copyright">
        Copyright 2024 Tomato.com - All Rights Reserved
      </p>

      {showTopBtn && (
        <button className="scroll-top-btn" onClick={scrollToTop}>↑</button>
      )}
    </div>
  );
};

export default Footer;
