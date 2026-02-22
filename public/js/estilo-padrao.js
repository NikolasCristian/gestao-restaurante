function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    const body = document.body;

    // Liga/Desliga as classes active
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Bloqueia o scroll do fundo quando o menu abrir
    body.classList.toggle('no-scroll');
}