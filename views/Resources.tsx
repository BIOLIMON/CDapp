import React, { useState } from 'react';
import { AlertTriangle, HelpCircle, Book, ChevronDown, ChevronUp } from 'lucide-react';

const Resources: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "¿Por qué esperar 21 días?", a: "Para que la sequía afecte directamente a las plantas ya desarrolladas y no interfiera con la germinación." },
    { q: "¿Qué pasa si olvido pesar un día?", a: "Registra el peso tan pronto puedas y anota la fecha real. La constancia es clave, pero un olvido puntual no arruina el experimento." },
    { q: "¿Qué hago si se acaba el fertilizante?", a: "Mantén el registro y anota la fecha de término en las observaciones." },
    { q: "¿Qué hago si hay hongos en la tierra?", a: "Es común y no suelen ser tóxicos. Retira suavemente la capa superficial afectada." },
  ];

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Safety Card */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3 text-red-700">
            <AlertTriangle size={24} />
            <h3 className="font-bold text-lg">Seguridad (KNO₃)</h3>
        </div>
        <ul className="list-disc list-inside text-sm text-red-800 space-y-2">
            <li>El fertilizante es oxidante: mantener lejos del fuego.</li>
            <li>No ingerir ni inhalar el polvo.</li>
            <li>Lavar manos tras manipular.</li>
            <li>En caso de contacto con ojos, lavar con agua 15 mins.</li>
            <li>Emergencias CITUC: +562 2 635 3800</li>
        </ul>
      </div>

      {/* FAQ Accordion */}
      <div>
        <h3 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2">
            <HelpCircle size={20} className="text-primary" />
            Preguntas Frecuentes
        </h3>
        <div className="space-y-2">
            {faqs.map((faq, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button 
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
                    >
                        <span className="font-medium text-sm text-gray-800">{faq.q}</span>
                        {openFaq === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {openFaq === idx && (
                        <div className="p-4 pt-0 text-sm text-gray-600 bg-gray-50 border-t border-gray-100">
                            {faq.a}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* Glossary */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
         <div className="flex items-center gap-3 mb-3 text-blue-700">
            <Book size={24} />
            <h3 className="font-bold text-lg">Glosario Rápido</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
                <span className="font-bold text-blue-900">RF (Riego+Fert):</span> Maceta 1. Control positivo.
            </div>
            <div>
                <span className="font-bold text-blue-900">SF (Sequía+Fert):</span> Maceta 2. Estrés hídrico con nutrientes.
            </div>
            <div>
                <span className="font-bold text-blue-900">R (Riego):</span> Maceta 3. Control de nutrientes.
            </div>
            <div>
                <span className="font-bold text-blue-900">S (Sequía):</span> Maceta 4. Estrés máximo.
            </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;