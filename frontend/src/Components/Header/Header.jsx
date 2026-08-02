import React, { useState } from "react";
import "./Header.css";
import Carousel from "../Carousel/Carousel";
import { FaLeaf, FaFire, FaInfinity } from "react-icons/fa";

const Header = ({ onFilterSelect, onVegToggle }) => {
  const [vegMode, setVegMode] = useState("All");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filters = [
    "Filters",
    "Offers",
    "Rating 4.5+",
    "High Protein",
    "Low Budget",
    "Student Combo",
  ];

  // ⭐ Handle clicking filter buttons
  const handleFilterClick = (filter) => {
    // Handle Filters dropdown
    if (filter === "Filters") {
      setShowFilterMenu(!showFilterMenu);
      return;
    }

    // ⭐ Toggle-off behavior (click again to reset)
    if (activeFilter === filter) {
      setActiveFilter("All");
      onFilterSelect("All");
      setShowFilterMenu(false);
      return;
    }

    // Regular filter selection
    setActiveFilter(filter);
    onFilterSelect(filter);
    setShowFilterMenu(false);
  };

  // ⭐ Handle Veg / All / Non-Veg selection inside dropdown
  const handleVegMode = (mode) => {
    setVegMode(mode);
    onVegToggle(mode);

    // Reset ALL filters when dietary "All" selected
    if (mode === "All") {
      setActiveFilter("All");
      onFilterSelect("All");
    }
  };

  return (
    <div className="header">
      <div className="header-carousel">
        <Carousel />
      </div>

      <div className="header-overlay">
        
        {/* ⭐ FILTER SECTION */}
        <div className="filter-section">
          
          {/* TOP FILTER BUTTONS */}
          <div className="filter-bar">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                onClick={() => handleFilterClick(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* ⭐ DROPDOWN BELOW FILTERS */}
          {showFilterMenu && (
            <div className="filter-dropdown">
              <h4>Dietary Preference</h4>

              <div className="veg-toggle-dropdown">
                
                <button
                  className={`veg-pill-v2 ${vegMode === "Veg" ? "active" : ""}`}
                  onClick={() => handleVegMode("Veg")}
                >
                  <FaLeaf className="veg-icon" /> Veg
                </button>

                <button
                  className={`veg-pill-v2 ${vegMode === "All" ? "active" : ""}`}
                  onClick={() => handleVegMode("All")}
                >
                  <FaInfinity className="veg-icon" /> All
                </button>

                <button
                  className={`veg-pill-v2 ${vegMode === "Non-Veg" ? "active" : ""}`}
                  onClick={() => handleVegMode("Non-Veg")}
                >
                  <FaFire className="veg-icon" /> Non-Veg
                </button>

              </div>
            </div>
          )}

        </div>

        {/* ⭐ HERO SECTION */}
        <div className="header-contents">
          <h2>Order your favourite food here</h2>
          <p>Choose from a diverse menu featuring delicious dishes</p>
          <button>
            <a href="#explore-menu" className="button-a">View Menu</a>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Header;
