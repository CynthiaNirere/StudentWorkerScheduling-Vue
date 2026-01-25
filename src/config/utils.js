export default class Utils {
  // set local storage
  static setStore = (name, content) => {
    if (!name) return;
    if (typeof content !== "string") {
      content = JSON.stringify(content);
    }
    return window.localStorage.setItem(name, content);
  };
  
  // get local storage
  static getStore = (name) => {
    if (!name) return null;
    
    try {
      const value = window.localStorage.getItem(name);
      
      // Handle null, undefined, or empty strings
      if (!value || value === 'undefined' || value === 'null') {
        return null;
      }
      
      return JSON.parse(value);
    } catch (error) {
      console.error(`Error parsing stored value for "${name}":`, error);
      return null;
    }
  };
  
  // remove item
  static removeItem = (name) => {
    if (!name) return;
    return window.localStorage.removeItem(name);
  };
  
  // validate email
  static isValidEmail = (value) => {
    return value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,64}$/i.test(value)
      ? false
      : true;
  };
}