document.getElementById('authenticate').addEventListener('click', () => {
    window.location.href = '/auth';
});

  document.getElementById('send-envelope').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    const roleName = document.getElementById('roleName').value;
  
    try {
      const response = await fetch('/send-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, roleName }),
      });
  
      if (!response.ok) {
        throw new Error(`Request failed with status code ${response.status}`);
      }
  
      alert('Envelope sent successfully!');
    } catch (error) {
      console.error('Error:', error.message);
      alert('An error occurred');
    }
  });
  
  if (window.location.search.includes('authenticated')) {
      document.getElementById('authenticate').style.display="none"
    document.getElementById('send-envelope').hidden = false;
  }
  