import React, { useState } from 'react';
import { AlertTriangle, HelpCircle, Book, ChevronDown, ChevronUp } from 'lucide-react';

const Resources: React.FC = () => {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs = [
        { q: "1. ¿Por qué las plantas tienen una fase de adaptación de 21 días?", a: "Para que la sequía afecte directamente a las plantas y no interfiera con la germinación. De esta manera, todas las plantas se encontrarán adaptadas de la misma manera cuando comience el experimento." },
        { q: "2. ¿Qué pasa si me olvido de pesar una maceta?", a: "Registra el peso tan pronto como puedas y anota en la plataforma la fecha real de la medición." },
        { q: "3. ¿Qué hago si se me acaba el fertilizante antes de terminar el experimento?", a: "Mantén el registro de los datos y coloca en las observaciones la fecha del término de fertilización con KNO3 para que los investigadores puedan tenerlo en consideración." },
        { q: "4. ¿Qué hago si mis semillas no germinan después de 10 días?", a: "Revisa la humedad del sustrato. Si está muy seco, aumenta el riego suavemente." },
        { q: "5. ¿Puedo sembrar semillas extra en las macetas?", a: "No. Cada maceta debe tener solo las semillas asignadas, para no alterar el diseño experimental." },
        { q: "6. ¿Qué pasa si riego en exceso una maceta de sequía?", a: "Registra el evento en la plataforma y continúa normalmente. Un riego extra ocasional no invalida el experimento, pero debe quedar registrado." },
        { q: "7. ¿Qué hago si todas las plantas parecen estar marchitas?", a: "Es normal que las plantas en sequía muestren signos de estrés (hojas caídas, amarillamiento). Sigue con el proceso hasta el final y anota las observaciones." },
        { q: "8. ¿Qué pasa si aplico demasiado fertilizante por error?", a: "Registra el hecho en la plataforma. No intentes retirar el exceso de fertilizante. Continúa el experimento normalmente y anótalo como observación." },
        { q: "9. ¿Puedo compartir fotos de mis plantas en redes sociales?", a: "¡Sí! Solo recuerda no mezclar etiquetas de tratamientos y usar el hashtag #CultivaDatos para que podamos encontrarlas y compartirlas." },
        { q: "10. Una planta se enfermó o murió, ¿puedo reemplazarla?", a: "No. Mantén la maceta en el experimento y sigue registrando su peso, aunque no tenga planta. Esto nos ayuda a entender mejor el proceso." },
        { q: "11. Aparecieron hongos o moho en la superficie del sustrato, ¿qué puedo hacer?", a: "La presencia de este tipo de hongos es muy común en los cultivos. Para solucionar esto, retira suavemente la capa superficial afectada sin mover la planta y anótalo como observación en la plataforma." }
    ];

    return (
        <div className="p-4 space-y-6 pb-20">
            {/* Safety Card */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3 text-red-700">
                    <AlertTriangle size={24} />
                    <h3 className="font-bold text-lg">Ficha Técnica de Seguridad – KNO3</h3>
                </div>
                <div className="text-sm text-red-900 space-y-3">
                    <p className="font-semibold text-xs uppercase tracking-wide text-red-500 mb-1">Medidas Preventivas</p>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-red-800">
                        <li>Es oxidante: mantener lejos del calor o llamas.</li>
                        <li>Manipular en lugar ventilado y guardar bien cerrado.</li>
                        <li>Fuera del alcance de niños y mascotas.</li>
                        <li>Utiliza guantes si tienes piel sensible.</li>
                    </ul>

                    <div className="border-t border-red-200 my-2 pt-2">
                        <p className="font-semibold text-xs uppercase tracking-wide text-red-500 mb-1">Primeros Auxilios</p>
                        <p><strong>Piel:</strong> Lavar con abundante agua.</p>
                        <p><strong>Ojos:</strong> Enjuagar inmediatamente con agua por al menos 15 mins.</p>
                        <p><strong>Ingestión:</strong> Acudir a un centro médico.</p>
                        <p className="mt-2 font-bold">Emergencias CITUC: +562 2 635 3800</p>
                    </div>
                </div>
            </div>

            {/* FAQ Accordion */}
            <div>
                <h3 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2">
                    <HelpCircle size={20} className="text-primary" />
                    Preguntas Frecuentes
                </h3>
                <div className="space-y-2">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <button
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
                            >
                                <span className="font-medium text-sm text-gray-800 pr-4">{faq.q}</span>
                                {openFaq === idx ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                            </button>
                            {openFaq === idx && (
                                <div className="p-4 pt-0 text-sm text-gray-600 bg-gray-50 border-t border-gray-100 leading-relaxed">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Glossary */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3 text-blue-700">
                    <Book size={24} />
                    <h3 className="font-bold text-lg">Glosario Científico</h3>
                </div>
                <div className="space-y-4 text-sm text-blue-900">
                    <div><span className="font-bold">Adaptación:</span> Proceso mediante el cual las plantas ajustan su crecimiento y metabolismo para sobrevivir a cambios en el ambiente.</div>
                    <div><span className="font-bold">Calibrar:</span> Ajustar un instrumento (balanza) para asegurar mediciones correctas.</div>
                    <div><span className="font-bold">Ciencia Ciudadana:</span> Colaboración entre personas no especializadas y científicos para recolectar datos.</div>
                    <div><span className="font-bold">Fertilizante (KNO3):</span> Sustancia que aporta nutrientes esenciales (nitrógeno y potasio) para favorecer el crecimiento.</div>
                    <div><span className="font-bold">Germinación:</span> Etapa inicial en la que una semilla comienza a crecer.</div>
                    <div><span className="font-bold">Hipótesis:</span> Suposición que se busca comprobar mediante observaciones y datos.</div>
                    <div><span className="font-bold">pH:</span> Medida de acidez (menor a 7), neutralidad (7) o basicidad (mayor a 7).</div>
                    <div><span className="font-bold">Pipeta Pasteur:</span> Instrumento para medir y transferir pequeños volúmenes de líquido.</div>
                    <div><span className="font-bold">Sequía:</span> Condición en la que las plantas reciben poco o nada de agua.</div>
                    <div><span className="font-bold">Tara:</span> Función de la balanza para poner a cero el peso antes de medir.</div>
                    <div><span className="font-bold">Tratamiento:</span> Condiciones experimentales aplicadas (riego, sequía, fertilización).</div>
                    <div><span className="font-bold">Variable:</span> Factor medible que puede cambiar (peso, altura).</div>
                </div>
            </div>
        </div>
    );
};

export default Resources;