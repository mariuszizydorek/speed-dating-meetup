describe('Speed Dating Meetup app', () => {
  it('loads the home page and navigates to about', () => {
    cy.viewport('iphone-x');
    cy.visit('/');
    cy.contains('Speed Dating Meetup').should('be.visible');
    cy.contains('Meet people. Real conversations. One night.').should('be.visible');

    cy.contains('a, button', 'About').click();
    cy.url().should('include', '/about');
    cy.contains('h1', 'About').should('be.visible');
  });
});
