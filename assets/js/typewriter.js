const text = "I AM ARYAN CHANDAK, WELCOME TO MY WEBSITE _";
let index = 0;

function typeWriter() {
  if (index < text.length) {
    document.getElementById("typewriter").innerHTML += text.charAt(index);
    index++;
    setTimeout(typeWriter, 100); // Adjust the speed (in milliseconds) as needed
  }
}

window.onload = function() {
  typeWriter();
};
