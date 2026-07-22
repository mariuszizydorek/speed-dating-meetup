describe('speed-networking golden path', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/setup');
  });

  it('imports roster, generates schedule, opens print, starts run', () => {
    cy.get('input[type=file]').selectFile('cypress/fixtures/roster-25.csv', { force: true });
    cy.contains(/25 people/i);
    cy.contains(/generate schedule/i).click();
    cy.location('pathname').should('eq', '/schedule');
    cy.contains(/^Generate$/).click();
    cy.contains(/round 1/i, { timeout: 8000 });
    cy.contains(/print materials/i).click();
    cy.location('pathname').should('eq', '/print');
    cy.contains(/personal plans/i);
    cy.contains(/start event/i).click();
    cy.location('pathname').should('eq', '/run');
    cy.contains(/round 1/i);
  });
});
