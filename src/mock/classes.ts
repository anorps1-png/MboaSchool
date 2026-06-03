import { Classe } from '@/types/domain';

export const mockClasses: Classe[] = [
  {
    id: 'Terminale D',
    niveauId: 'Terminale D',
    nom: 'Terminale D',
    enseignantPrincipalId: 'Jean Dupont', 
    enseignantAssistantId: 'Marie Curie',
    anneeScolaireId: 'as-2025'
  },
  {
    id: '3ème',
    niveauId: '3ème',
    nom: '3ème Espagnol',
    enseignantPrincipalId: 'Marie Curie', 
    anneeScolaireId: 'as-2025'
  },
  {
    id: 'Maternelle',
    niveauId: 'Maternelle',
    nom: 'Maternelle Grande Section',
    enseignantPrincipalId: 'Jean Dupont',
    anneeScolaireId: 'as-2025'
  }
];
